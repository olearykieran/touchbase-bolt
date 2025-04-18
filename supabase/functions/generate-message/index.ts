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
  messageType?: 'default' | 'love' | 'gratitude' | 'custom' | 'birthday';
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
    default:
      return 'You are writing a friendly catch-up message. Keep it casual and brief, limited to 2-3 sentences.';
  }
};

const getPrompt = (
  contact: any,
  messageType: string,
  lastMessage?: string,
  customPrompt?: string
) => {
  const baseContext = `
Context about ${contact.name}:
- Last contacted: ${contact.lastContact}
- Contact frequency: ${contact.frequency}
- Previous message (if any): ${lastMessage || 'None'}`;

  switch (messageType) {
    case 'love':
      return `Write a brief, heartfelt message to ${contact.name}.
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
      return `Write a birthday message to ${contact.name}.
${baseContext}

Guidelines:
- Make it warm and celebratory
- Include well-wishes for the year ahead
- Add a personal touch of appreciation
- Limit to 3-4 sentences maximum
- Keep it upbeat and positive
- No long explanations`;

    case 'custom':
      return `Write a message to ${contact.name} based on this prompt: "${customPrompt}"
${baseContext}

Guidelines:
- Address the prompt directly
- Keep it natural but concise
- Limit to 4-5 sentences maximum
- Be specific but brief
- No long explanations`;

    default:
      return `Write a friendly catch-up message to ${contact.name}.
${baseContext}

Guidelines:
- Keep it casual and warm
- Limit to 2-3 sentences maximum
- Reference time since last contact
- Suggest catching up briefly
- No long explanations`;
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
