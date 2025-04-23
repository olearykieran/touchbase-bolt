import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import OpenAI from 'npm:openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  contact: {
    name: string;
    lastContact: string;
    frequency: string;
  };
  lastMessage?: string;
  messageType?: 'default' | 'love' | 'gratitude' | 'custom' | 'birthday' | 'joke' | 'fact';
  customPrompt?: string;
}

const getSystemPrompt = (messageType: string) => {
  switch (messageType) {
    case 'love':
      return 'You are writing a brief, heartfelt message expressing appreciation and love. Keep it genuine and warm, but limit it to 2-3 sentences max.';
    case 'gratitude':
      return 'You are creating a simple list of 10 random things to be grateful for. Each item must be 5 words or less, starting with "I\'m grateful for..."';
    case 'custom':
      return 'You are writing a personalized message based on a specific prompt. Keep it natural and concise, limited to 4-5 sentences max.';
    case 'birthday':
      return 'You are writing a warm and cheerful birthday message. Keep it celebratory and personal, with a mix of well-wishes and appreciation. Limit it to 3-4 sentences max.';
    case 'joke':
      return 'You are a witty comedian. Tell a short, clean, and generally funny joke suitable for a text message. Keep it brief (1-3 sentences). Avoid controversial topics.';
    case 'fact':
      return 'You are a knowledgeable source. Provide one interesting, concise, and easily understandable random fact. Keep it brief (1-3 sentences). Ensure it\'s generally appropriate and verifiable.';
    default:
      return 'You are writing a casual, friendly catch-up text message, like a real person would. Keep it brief (1-2 sentences), warm, and natural-sounding. Avoid sounding like an AI. Vary the phrasing.';
  }
};

const getPrompt = (
  contact: any,
  messageType: string,
  lastMessage?: string,
  customPrompt?: string
) => {
  // Extract first name (handle cases with no spaces)
  const firstName = contact.name?.split(' ')[0] || contact.name || 'there';

  const baseContext = `
Context about ${firstName}:
- Last contacted: ${contact.lastContact}
- Contact frequency: ${contact.frequency}
- Previous message (if any): ${lastMessage || 'None'}`;

  switch (messageType) {
    case 'love':
      return `Write a brief, heartfelt message to ${firstName}.
${baseContext}

Guidelines:
- Express genuine care and appreciation
- Keep it warm and sincere
- Limit to 2-3 sentences maximum
- Make it personal but concise
- No long explanations`;

    case 'gratitude':
      return `Create a simple list of 10 random things to be grateful for.
${baseContext}

Guidelines:
- Each item MUST be 5 words or less
- Start each item with "I'm grateful for..."
- Keep it simple and universal
- No long explanations
- Format as a numbered list
- Example format:
1. I'm grateful for warm sunshine
2. I'm grateful for morning coffee
etc.`;

    case 'birthday':
      return `Write a birthday message to ${firstName}.
${baseContext}

Guidelines:
- Make it warm and celebratory
- Include well-wishes for the year ahead
- Add a personal touch of appreciation
- Limit to 3-4 sentences maximum
- Keep it upbeat and positive
- No long explanations`;

    case 'custom':
      return `Write a message to ${firstName} based on this prompt: "${customPrompt}"
${baseContext}

Guidelines:
- Address the prompt directly
- Keep it natural but concise
- Limit to 4-5 sentences maximum
- Be specific but brief
- No long explanations`;

    case 'joke':
      return `Tell ${firstName} a short, clean joke suitable for a text message.
${baseContext}

Guidelines:
- Keep it brief (1-3 sentences).
- Make it generally funny and lighthearted.
- Avoid complex or niche humor.`;

    case 'fact':
      return `Share an interesting random fact with ${firstName}.
${baseContext}

Guidelines:
- Keep it brief (1-3 sentences).
- Ensure the fact is concise and easy to understand.
- Aim for widely interesting topics (science, history, nature, etc.).`;

    default:
      return `Write a casual, friendly catch-up text message to ${firstName}.
${baseContext}

Guidelines:
- Sound like a real person, not an AI.
- Keep it brief (1-2 sentences).
- Be warm and natural.
- Examples: "Hey ${firstName}, thinking of you! How've you been?", "Hi ${firstName}, just wanted to say hello! Hope you're doing well.", "What's up ${firstName}? Been a while, hope things are good!"
- Vary the phrasing each time.`;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Create Supabase Admin client for elevated privileges (bypasses RLS)
    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false, // Avoid storing session for admin client
        },
      }
    );

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    // Get the JWT token
    const token = authHeader.replace('Bearer ', '');

    // Verify the user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Fetch user profile for quota enforcement (use admin client)
    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      throw new Error('User profile not found');
    }

    // Quota enforcement logic
    const isFreeTier = profile.subscription_status === 'free';
    let { weekly_message_count, last_message_reset } = profile;
    const now = new Date();
    let needsReset = false;
    if (!last_message_reset) {
      needsReset = true;
    } else {
      const lastReset = new Date(last_message_reset);
      // If more than 7 days since last reset, reset count
      if (now.getTime() - lastReset.getTime() >= 7 * 24 * 60 * 60 * 1000) {
        needsReset = true;
      }
    }
    if (isFreeTier) {
      if (needsReset) {
        // Reset weekly_message_count and last_message_reset (use admin client)
        const { error: resetError } = await supabaseAdminClient
          .from('profiles')
          .update({
            weekly_message_count: 0,
            last_message_reset: now.toISOString(),
          })
          .eq('id', user.id);
        if (resetError) {
          throw new Error('Failed to reset weekly message count');
        }
        weekly_message_count = 0;
      }
      if (weekly_message_count >= 3) {
        // Quota exceeded
        return new Response(
          JSON.stringify({
            error: 'PaymentRequiredError',
            details: 'Free tier limited to 3 AI messages per week. Subscribe to unlock more.',
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Get the request body
    const requestBody = await req.json();
    console.log('Request body:', requestBody);

    const {
      contact,
      lastMessage,
      messageType = 'default',
      customPrompt,
    }: MessageRequest = requestBody;
    console.log('Processing message generation:', { messageType, contact });

    if (!contact) {
      throw new Error('Contact information is required');
    }

    if (messageType === 'custom' && !customPrompt) {
      throw new Error('Custom prompt is required for custom messages');
    }

    // Check if we have an OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log('OpenAI API Key status:', openaiApiKey ? 'Present' : 'Missing');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const systemPrompt = getSystemPrompt(messageType);
    const userPrompt = getPrompt(
      contact,
      messageType,
      lastMessage,
      customPrompt
    );

    console.log('Prompts:', {
      messageType,
      systemPrompt: systemPrompt.substring(0, 50) + '...',
      userPrompt: userPrompt.substring(0, 50) + '...',
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-nano',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: messageType === 'gratitude' ? 500 : 250,
      temperature: messageType === 'custom' ? 0.8 : 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.6,
    });

    console.log('OpenAI Response:', {
      messageType,
      systemPrompt,
      userPrompt,
      response: completion.choices[0].message?.content,
    });

    const message = completion.choices[0].message?.content;
    if (!message) {
      throw new Error('No message was generated');
    }

    console.log('Generated message:', {
      messageType,
      messagePreview: message.substring(0, 50) + '...',
    });

    // On success, increment weekly_message_count for free tier (use admin client)
    if (isFreeTier) {
      const { error: incError } = await supabaseAdminClient
        .from('profiles')
        .update({ weekly_message_count: weekly_message_count + 1 })
        .eq('id', user.id);
      if (incError) {
        console.error('Failed to increment weekly_message_count:', incError);
      }
    }

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack?.split('\n')[0],
    });

    let errorMessage = 'Failed to generate message';
    if (error.message.includes('API key')) {
      errorMessage = 'Server configuration error';
    } else if (error.message.includes('Authentication')) {
      errorMessage = 'Please sign in again';
    } else if (error.message.includes('model')) {
      errorMessage = 'Model not available. Please check your OpenAI access.';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
