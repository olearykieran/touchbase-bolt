import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import OpenAI from 'npm:openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MessageRequest {
  contact: {
    name: string;
    lastContact: string;
    frequency: string;
  };
  lastMessage?: string;
  messageType?: 'default' | 'love' | 'gratitude' | 'custom';
  customPrompt?: string;
}

const getSystemPrompt = (messageType: string) => {
  switch (messageType) {
    case 'love':
      return 'You are writing a heartfelt message expressing deep appreciation and love. Keep it genuine, warm, and personal without being overly dramatic.';
    case 'gratitude':
      return 'You are creating a list of 10 specific things to be grateful for about someone. Make each item personal and meaningful, starting with "I\'m grateful for..."';
    case 'custom':
      return 'You are writing a personalized message based on a specific prompt. Keep it natural and conversational while addressing the prompt directly.';
    default:
      return 'You are writing a friendly catch-up message. Keep it casual, warm, and natural.';
  }
};

const getPrompt = (contact: any, messageType: string, lastMessage?: string, customPrompt?: string) => {
  const baseContext = `
Context about ${contact.name}:
- Last contacted: ${contact.lastContact}
- Contact frequency: ${contact.frequency}
- Previous message (if any): ${lastMessage || 'None'}`;

  switch (messageType) {
    case 'love':
      return `Write a heartfelt message to ${contact.name} expressing love and appreciation.
${baseContext}

Guidelines:
- Express genuine care and appreciation
- Mention specific qualities you admire
- Keep it warm and sincere
- Avoid being overly dramatic
- Make it personal and meaningful`;

    case 'gratitude':
      return `Create a list of 10 specific things you're grateful for about ${contact.name}.
${baseContext}

Guidelines:
- Start each item with "I'm grateful for..."
- Include personality traits
- Mention specific moments or memories
- Reference their impact on others
- Make each item unique and meaningful
- Format as a numbered list`;

    case 'custom':
      return `Write a message to ${contact.name} based on this prompt: "${customPrompt}"
${baseContext}

Guidelines:
- Address the prompt directly
- Keep it natural and conversational
- Maintain appropriate tone
- Include relevant context
- Be specific and personal`;

    default:
      return `Write a friendly catch-up message to ${contact.name}.
${baseContext}

Guidelines:
- Keep it casual and warm
- Ask about their well-being
- Reference the time since last contact
- Suggest catching up
- Keep it concise and natural`;
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
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Get the request body
    const { contact, lastMessage, messageType = 'default', customPrompt }: MessageRequest = await req.json();
    
    if (!contact) {
      throw new Error('Contact information is required');
    }

    if (messageType === 'custom' && !customPrompt) {
      throw new Error('Custom prompt is required for custom messages');
    }

    // Check if we have an OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key is not configured');
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(messageType),
        },
        {
          role: 'user',
          content: getPrompt(contact, messageType, lastMessage, customPrompt),
        },
      ],
      max_tokens: messageType === 'gratitude' ? 500 : 250,
      temperature: messageType === 'custom' ? 0.8 : 0.7,
      presence_penalty: 0.6,
      frequency_penalty: 0.6,
    });

    const message = completion.choices[0].message?.content;
    if (!message) {
      throw new Error('No message was generated');
    }

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    
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
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});