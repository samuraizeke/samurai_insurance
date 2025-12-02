import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';
import crypto from 'crypto';

const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

// GET endpoint for Facebook webhook verification (this part is fine)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Facebook webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('Facebook webhook verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// Verify Facebook signature (this is good)
function verifySignature(payload: string, signature: string | null): boolean {
  if (!signature || !APP_SECRET) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// Fetch lead details from Facebook Graph API
async function fetchLeadFromFacebook(leadgenId: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${leadgenId}?access_token=${PAGE_ACCESS_TOKEN}`
    );

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
    }

    const data = await response.json();

    // Parse field_data array into a more usable format
    const leadInfo: any = {
      id: data.id,
      created_time: data.created_time,
    };

    // Facebook returns data in field_data array
    if (data.field_data) {
      for (const field of data.field_data) {
        const fieldName = field.name.toLowerCase().replace(/ /g, '_');
        leadInfo[fieldName] = field.values?.[0] || '';
      }
    }

    return leadInfo;
  } catch (error) {
    console.error('Error fetching lead from Facebook:', error);
    throw error;
  }
}

// POST endpoint for receiving Facebook lead data
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify the request signature
    if (!verifySignature(rawBody, signature)) {
      console.error('Invalid Facebook webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const body = JSON.parse(rawBody);

    // Process page subscription
    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value?.leadgen_id;
            const formId = change.value?.form_id;
            const pageId = change.value?.page_id;

            console.log('Received lead notification:', {
              leadgenId,
              formId,
              pageId,
            });

            // Fetch the actual lead data from Facebook
            if (leadgenId) {
              try {
                const leadData = await fetchLeadFromFacebook(leadgenId);
                await processLead(leadData);
              } catch (error) {
                console.error(`Failed to process lead ${leadgenId}:`, error);
              }
            }
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Facebook webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processLead(leadData: any) {
  try {
    const supabase = createSupabaseServerClient();

    // Map Facebook field names to your database columns
    // Adjust these based on your actual form field names
    const first_name = leadData.first_name || leadData.full_name?.split(' ')[0] || '';
    const last_name = leadData.last_name || leadData.full_name?.split(' ').slice(1).join(' ') || '';
    const email = leadData.email || '';

    if (!email) {
      console.error('No email found in lead data');
      return;
    }

    const normalizedEmail = email.toLowerCase();

    // Check if email already exists
    const { data: existingEntries, error: fetchError } = await supabase
      .from('waitlist')
      .select('id')
      .ilike('email', normalizedEmail)
      .limit(1);

    if (fetchError) {
      console.error('Failed to check existing waitlist entry:', fetchError);
      return;
    }

    if (existingEntries && existingEntries.length > 0) {
      console.log(`Email ${normalizedEmail} already exists in waitlist`);
      return;
    }

    // Insert new lead with additional metadata
    const { error: insertError } = await supabase.from('waitlist').insert({
      first_name,
      last_name,
      email: normalizedEmail,
      source: 'Facebook',
      facebook_lead_id: leadData.id, // Store Facebook lead ID for reference
      raw_data: leadData, // Optionally store complete response
    });

    if (insertError) {
      if (insertError.code === '23505') {
        console.log(`Email ${normalizedEmail} already exists (duplicate key)`);
      } else {
        console.error('Failed to insert Facebook lead:', insertError);
      }
      return;
    }

    console.log(`Successfully added Facebook lead: ${normalizedEmail}`);
  } catch (error) {
    console.error('Error processing lead data:', error);
  }
}