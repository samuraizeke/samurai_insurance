/**
 * MCP (Model Context Protocol) Client for Supabase Integration
 *
 * This module manages MCP server connections for the Sam agent,
 * enabling direct database queries while maintaining user isolation.
 *
 * SECURITY ARCHITECTURE:
 * - The MCP server uses a Supabase access token (management API)
 * - User isolation is enforced via system prompts and query validation
 * - All tool calls are logged for audit purposes
 */
import dotenv from 'dotenv';

dotenv.config();

// Type definitions for MCP (avoiding ESM import issues)
interface MCPToolInputSchema {
    type: string;
    properties?: Record<string, {
        type: string;
        description?: string;
        enum?: string[];
        items?: unknown;
        default?: unknown;
    }>;
    required?: string[];
}

interface MCPTool {
    name: string;
    description?: string;
    inputSchema?: MCPToolInputSchema;
}

interface MCPConnection {
    client: any;
    transport: any;
    isConnected: boolean;
}

// Connection pool to reuse MCP connections
let connectionPool: MCPConnection | null = null;
let connectionInUse = false;
const CONNECTION_TIMEOUT_MS = 30000;

/**
 * Dynamically imports MCP SDK (ESM module in CommonJS context)
 */
async function importMCP() {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');
    return { Client, StdioClientTransport };
}

/**
 * Creates a new MCP connection to the Supabase server
 */
export async function createMCPConnection(): Promise<MCPConnection> {
    const accessToken = process.env.SUPABASE_MCP_ACCESS_TOKEN;

    if (!accessToken) {
        throw new Error('SUPABASE_MCP_ACCESS_TOKEN environment variable is required');
    }

    const { Client, StdioClientTransport } = await importMCP();

    const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@supabase/mcp-server-supabase@latest', '--access-token', accessToken],
    });

    const client = new Client(
        { name: 'samurai-sam-agent', version: '1.0.0' },
        { capabilities: {} }
    );

    const connection: MCPConnection = {
        client,
        transport,
        isConnected: false,
    };

    try {
        await Promise.race([
            client.connect(transport),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('MCP connection timeout')), CONNECTION_TIMEOUT_MS)
            ),
        ]);

        connection.isConnected = true;
        console.log('[MCP] Successfully connected to Supabase MCP server');
        return connection;
    } catch (error) {
        await closeMCPConnection(connection);
        throw error;
    }
}

/**
 * Gets or creates an MCP connection from the pool
 */
export async function getMCPConnection(): Promise<MCPConnection> {
    // If there's an existing connection that's not in use, return it
    if (connectionPool && connectionPool.isConnected && !connectionInUse) {
        connectionInUse = true;
        return connectionPool;
    }

    // Create a new connection
    const connection = await createMCPConnection();
    connectionPool = connection;
    connectionInUse = true;
    return connection;
}

/**
 * Releases the connection back to the pool
 */
export function releaseMCPConnection(): void {
    connectionInUse = false;
}

/**
 * Closes an MCP connection and cleans up resources
 */
export async function closeMCPConnection(connection: MCPConnection): Promise<void> {
    console.log('[MCP] Closing MCP connection...');

    try {
        if (connection.isConnected && connection.client) {
            await connection.client.close();
        }
    } catch (error) {
        console.error('[MCP] Error closing client:', error);
    }

    try {
        if (connection.transport) {
            await connection.transport.close();
        }
    } catch (error) {
        console.error('[MCP] Error closing transport:', error);
    }

    connection.isConnected = false;

    if (connectionPool === connection) {
        connectionPool = null;
    }

    console.log('[MCP] Connection closed');
}

/**
 * Lists available tools from the MCP server
 */
export async function listMCPTools(connection: MCPConnection): Promise<MCPTool[]> {
    if (!connection.isConnected) {
        throw new Error('MCP client is not connected');
    }

    const response = await connection.client.listTools();
    return response.tools as MCPTool[];
}

/**
 * Executes a tool call via the MCP server
 *
 * SECURITY: All tool calls are logged for audit purposes
 */
export async function executeMCPTool(
    connection: MCPConnection,
    toolName: string,
    args: Record<string, unknown>
): Promise<unknown> {
    if (!connection.isConnected) {
        throw new Error('MCP client is not connected');
    }

    console.log(`[MCP] Executing tool: ${toolName}`);
    console.log(`[MCP] Arguments:`, JSON.stringify(args, null, 2));

    const result = await connection.client.callTool({
        name: toolName,
        arguments: args,
    });

    console.log(`[MCP] Tool result received (${JSON.stringify(result).length} chars)`);

    return result;
}

/**
 * Filters tools to only safe, read-focused operations
 */
export function filterSafeTools(tools: MCPTool[]): MCPTool[] {
    const safePatterns = [
        /^list_/,
        /^get_/,
        /^search_/,
        /^execute_sql$/, // We control SQL via system prompt
    ];

    const blockedPatterns = [
        /^delete_/,
        /^drop_/,
        /^truncate_/,
        /^create_project$/,
        /^pause_project$/,
        /^restore_project$/,
        /^apply_migration$/,
        /^deploy_edge_function$/,
    ];

    return tools.filter((tool) => {
        const name = tool.name.toLowerCase();

        if (blockedPatterns.some((pattern) => pattern.test(name))) {
            console.log(`[MCP] Blocked tool: ${tool.name}`);
            return false;
        }

        if (safePatterns.some((pattern) => pattern.test(name))) {
            return true;
        }

        console.log(`[MCP] Filtered unrecognized tool: ${tool.name}`);
        return false;
    });
}

/**
 * Converts MCP tools to Vertex AI function declarations
 */
export function convertMCPToolsToVertexAI(mcpTools: MCPTool[]): any[] {
    return mcpTools.map((tool) => {
        const properties: Record<string, any> = {};

        if (tool.inputSchema?.properties) {
            for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
                properties[key] = {
                    type: value.type.toUpperCase(),
                    description: value.description || '',
                };

                if (value.enum) {
                    properties[key].enum = value.enum;
                }
            }
        }

        return {
            name: tool.name,
            description: tool.description || `Execute the ${tool.name} tool`,
            parameters: {
                type: 'OBJECT',
                properties,
                required: tool.inputSchema?.required || [],
            },
        };
    });
}

/**
 * Validates a SQL query for security before execution
 *
 * CRITICAL: This is an additional layer of defense beyond system prompts
 */
export function validateSQLQuery(
    query: string,
    userId: string
): { valid: boolean; error?: string } {
    const lowerQuery = query.toLowerCase().trim();

    // Block DDL statements
    const ddlPatterns = [
        /\bdrop\b/,
        /\bcreate\b/,
        /\balter\b/,
        /\btruncate\b/,
        /\bgrant\b/,
        /\brevoke\b/,
    ];

    for (const pattern of ddlPatterns) {
        if (pattern.test(lowerQuery)) {
            return { valid: false, error: 'DDL statements are not permitted' };
        }
    }

    // Check for user_id filter on sensitive tables
    const sensitiveTablePatterns = [
        /\bfrom\s+(policies|chat_sessions|conversations|documents|claims|users|user_documents)\b/i,
    ];

    for (const pattern of sensitiveTablePatterns) {
        if (pattern.test(lowerQuery)) {
            const hasUserFilter =
                lowerQuery.includes(`user_id = '${userId}'`) ||
                lowerQuery.includes(`user_id='${userId}'`) ||
                lowerQuery.includes(`external_id = '${userId}'`) ||
                lowerQuery.includes(`external_id='${userId}'`);

            if (!hasUserFilter) {
                return {
                    valid: false,
                    error: 'Queries on user data must include user_id filter',
                };
            }
        }
    }

    // Check for SQL injection patterns
    const injectionPatterns = [
        /;\s*--/,
        /'\s*or\s+'?1'?\s*=\s*'?1/i,
        /\bunion\s+select\b/i,
        /\binto\s+outfile\b/i,
    ];

    for (const pattern of injectionPatterns) {
        if (pattern.test(lowerQuery)) {
            return { valid: false, error: 'Query contains suspicious patterns' };
        }
    }

    return { valid: true };
}

/**
 * Generates the secure system prompt section for database access
 */
export function generateDatabaseSecurityPrompt(userId: string): string {
    return `
## DATABASE ACCESS SECURITY (MANDATORY)

You have access to database tools via the Supabase MCP server.

### AUTHENTICATED USER
- **User ID**: \`${userId}\`

### CRITICAL CONSTRAINTS (NO EXCEPTIONS)

1. **USER ISOLATION**: You MUST include \`WHERE user_id = '${userId}'\` in EVERY query on user data tables.

2. **ALLOWED TABLES & REQUIRED FILTERS**:
   - \`user_documents\`: WHERE user_id = '${userId}' - Contains uploaded policy documents with GCS references
   - \`policies\`: WHERE user_id = '${userId}'
   - \`chat_sessions\`: WHERE user_id = '${userId}'
   - \`conversations\`: WHERE session_id IN (SELECT id FROM chat_sessions WHERE user_id = '${userId}')

3. **USER_DOCUMENTS TABLE SCHEMA** (for policy document queries):
   - \`id\`: Document ID (bigint)
   - \`user_id\`: Owner's user ID
   - \`document_type\`: Type of document ('policy', 'id_card', 'claim', 'other')
   - \`policy_type\`: Insurance type ('auto', 'home', 'renters', 'umbrella', 'life', 'health', 'other')
   - \`file_name\`: Original uploaded file name
   - \`gcs_uri\`: Google Cloud Storage URI (auto-generated)
   - \`carrier_name\`: Insurance carrier/company name
   - \`policy_number\`: Policy number if extracted
   - \`analysis_summary\`: AI-generated analysis of the policy
   - \`extracted_data\`: JSON with extracted policy details
   - \`status\`: Document status ('active', 'archived', 'deleted')
   - \`uploaded_at\`: Upload timestamp

4. **FORBIDDEN OPERATIONS**:
   - Queries without user_id filter on user data
   - DDL statements (CREATE, DROP, ALTER, TRUNCATE)
   - Queries accessing other users' data
   - UNION or subqueries that bypass filters

5. **SAFE QUERY EXAMPLES**:
   \`\`\`sql
   -- Get user's uploaded policy documents
   SELECT id, policy_type, carrier_name, analysis_summary, uploaded_at
   FROM user_documents
   WHERE user_id = '${userId}' AND status = 'active'
   ORDER BY uploaded_at DESC;

   -- Get a specific policy type
   SELECT * FROM user_documents
   WHERE user_id = '${userId}' AND policy_type = 'auto' AND status = 'active';

   -- Get chat sessions
   SELECT * FROM chat_sessions WHERE user_id = '${userId}' ORDER BY created_at DESC LIMIT 10;
   \`\`\`

6. **WHEN TO USE DATABASE**:
   - Fetching user's uploaded policy documents and their analysis
   - Getting chat session history
   - Looking up user preferences or settings
   - Finding which policies the user has uploaded
   - Do NOT use for general insurance knowledge (use Uri for that)
`;
}

// Cleanup on process exit
process.on('beforeExit', async () => {
    if (connectionPool) {
        await closeMCPConnection(connectionPool);
    }
});
