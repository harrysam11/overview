import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate VAPID keys using Web Crypto API
async function generateVapidKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const privateKey = btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return { publicKey, privateKey };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check if keys already exist in environment
    const existingPublic = Deno.env.get('VAPID_PUBLIC_KEY');
    const existingPrivate = Deno.env.get('VAPID_PRIVATE_KEY');

    if (existingPublic && existingPrivate) {
      console.log('Using existing VAPID keys');
      return new Response(
        JSON.stringify({ 
          publicKey: existingPublic,
          message: 'Using existing VAPID keys'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Generate new keys
    console.log('Generating new VAPID keys');
    const keys = await generateVapidKeys();

    // Return public key (private key should be stored as secret)
    return new Response(
      JSON.stringify({ 
        publicKey: keys.publicKey,
        privateKey: keys.privateKey,
        message: 'New VAPID keys generated. Store the private key as a secret!'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
