import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
// For Deno in Supabase Edge Functions, this import will work at runtime despite TypeScript errors
import OpenAI from 'npm:openai@4.28.0';

interface MessageRequest {
  contact: {
    name: string;
    lastContact: string;
    frequency: string;
  };
  lastMessage?: string;
  messageType?:
    | 'default'
    | 'love'
    | 'gratitude'
    | 'custom'
    | 'birthday'
    | 'joke'
    | 'fact';
  customPrompt?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const getSystemPrompt = (messageType: string) => {
  switch (messageType) {
    case 'love':
      return 'You are writing a brief, heartfelt message expressing appreciation and love. Keep it genuine and warm, but limit it to 2-3 sentences max. Each message should feel fresh and personal.';
    case 'gratitude':
      return 'You are helping someone reflect on real, relatable things to be grateful for. Generate diverse, genuine items that real people actually appreciate in daily life. Balance between common comforts and unique moments, but keep them grounded and authentic. Avoid overly poetic or abstract items.';
    case 'custom':
      return 'You are writing a personalized message based on a specific prompt. Keep it natural and concise, limited to 4-5 sentences max. Make each response unique and tailored.';
    case 'birthday':
      return 'You are writing a warm and cheerful birthday message. Keep it celebratory and personal, with a mix of well-wishes and appreciation. Limit it to 3-4 sentences max. Make each birthday wish unique and memorable.';
    case 'joke':
      return 'You are an innovative comedian with access to infinite humor styles. Your jokes should be unexpected, clever, and delightfully surprising. Each joke must be completely original - never repeat structures, topics, or punchlines. Push creative boundaries while staying family-friendly.';
    case 'fact':
      return "You are a curator of mind-blowing knowledge from across all domains of human understanding. Each fact you share should make people's eyes widen with wonder. Draw from the most unexpected corners of science, history, and culture. Never repeat similar categories or themes.";
    default:
      return 'You are writing a casual, friendly catch-up text message, like a real person would. Keep it brief (1-2 sentences), warm, and natural-sounding. Each message should have a different tone and approach - sometimes questioning, sometimes sharing, sometimes just saying hi.';
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
  
  // Add time-based context for variety
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'fall';

  // Add randomization seed for maximum variation
  const randomSeed = Math.floor(Math.random() * 1000000);
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  
  const baseContext = `
Context about ${firstName}:
- Last contacted: ${contact.lastContact}
- Contact frequency: ${contact.frequency}
- Previous message (if any): ${lastMessage || 'None'}
- Current time: ${timeOfDay}
- Current season: ${season}
- Day: ${dayOfWeek}
- Random seed: ${randomSeed} (use this to ensure unique responses)`;

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

INSTRUCTIONS FOR REALISTIC VARIETY:
- Generate a COMPLETELY UNIQUE list each time - never repeat items
- Focus on REAL things people genuinely appreciate in daily life
- Mix everyday comforts with specific moments, but keep them relatable
- Categories to draw from: daily routines, simple pleasures, technology that works, nature moments, food experiences, human connections, small conveniences, seasonal joys, physical comforts, emotional relief
- Be specific but not overly poetic (e.g., "hot shower after work" not "crystalline water cascades")
- Include both common appreciations and unique personal moments
- Think about what actually makes people's days better
- Balance between material things, experiences, and feelings
- Keep it genuine - things that would make someone nod and say "yes, that IS nice"

Format requirements:
- Each item MUST be 5 words or less
- Start each item with "I'm grateful for..."
- Format as a numbered list
- Keep items concrete and relatable
- Avoid abstract poetry - be real`;

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

CRITICAL CREATIVITY INSTRUCTIONS:
- Generate a COMPLETELY ORIGINAL joke each time - surprise me!
- Draw from the infinite well of humor: absurdist, observational, wordplay, puns, anti-jokes, surreal, meta-humor
- Mix unexpected topics: quantum physics meets cooking, philosophy meets pets, history meets modern tech
- Play with format: one-liners, Q&A, story jokes, anti-jokes, breaking the fourth wall
- Be unpredictable - if you think of an obvious joke, skip it and go weirder
- Combine unrelated concepts for surprising punchlines
- Use specific details instead of generic setups
- Think laterally - the best jokes come from unexpected connections
- Consider cultural references, science, arts, everyday absurdities
- MOST IMPORTANT: Each joke must be totally different in structure, topic, and style from any previous joke

Requirements:
- Keep it brief (1-3 sentences)
- Family-friendly and lighthearted
- Make it genuinely surprising and delightful
- NO OVERUSED FORMATS - be original!`;

    case 'fact':
      return `Share an interesting random fact with ${firstName}.
${baseContext}

MAXIMUM VARIATION INSTRUCTIONS:
- Each fact must be COMPLETELY DIFFERENT - topic, field, time period, scale
- Randomly select from infinite knowledge domains: quantum mechanics, ancient civilizations, deep ocean, distant galaxies, microscopic life, future predictions, cultural oddities, linguistic quirks, mathematical paradoxes, biological mysteries
- Mix scales wildly: subatomic to cosmic, nanoseconds to millennia, microscopic to planetary
- Include facts that challenge assumptions or reveal hidden connections
- Draw from cutting-edge research, historical mysteries, natural phenomena, human achievements
- Combine unexpected elements: "Did you know [unexpected thing] is related to [seemingly unrelated thing]?"
- Be specific with numbers, dates, locations when possible
- Choose facts that make people go "Wait, really?!"
- Consider facts about processes, not just objects
- Include facts from non-Western cultures and lesser-known fields
- CRITICAL: Never repeat similar categories or themes - maximum diversity!

Format:
- Keep it brief (1-3 sentences)
- Make it mind-blowing yet believable
- Include specific details that add credibility
- End with impact - leave them thinking!`;

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error('No authorization header');
    }

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Authentication failed');
    }

    console.log('Request by user:', user.id);

    const supabaseAdminClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: profile, error: profileError } = await supabaseAdminClient
      .from('profiles')
      .select(
        'subscription_status, subscription_end, weekly_message_count, last_message_reset'
      )
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Failed to get user profile',
          details: profileError.message,
        }),
        { status: 400 }
      );
    }

    console.log('User profile:', profile);
    const isFreeTier =
      !profile.subscription_status || profile.subscription_status === 'free';
    const now = new Date();

    console.log('Complete profile data:', profile);
    console.log('Is free tier?', isFreeTier);
    console.log('Current weekly message count:', profile.weekly_message_count);

    let weekly_message_count = profile.weekly_message_count || 0;

    if (isFreeTier) {
      if (profile.last_message_reset) {
        const lastReset = new Date(profile.last_message_reset);
        const daysSinceReset = Math.floor(
          (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log('Days since last message reset:', daysSinceReset);

        if (daysSinceReset >= 7) {
          console.log('Resetting weekly message count (been 7+ days)');
          const { error: resetError } = await supabaseAdminClient
            .from('profiles')
            .update({
              weekly_message_count: 0,
              last_message_reset: now.toISOString(),
            })
            .eq('id', user.id);
          if (resetError) {
            console.error('Failed to reset weekly message count:', resetError);
            throw new Error('Failed to reset weekly message count');
          }
          weekly_message_count = 0;
        }
      } else {
        console.log('Initializing last_message_reset');
        const { error: initError } = await supabaseAdminClient
          .from('profiles')
          .update({
            last_message_reset: now.toISOString(),
          })
          .eq('id', user.id);
        if (initError) {
          console.error('Failed to initialize last_message_reset:', initError);
        }
      }

      console.log(
        'Checking message quota. Current count:',
        weekly_message_count
      );
      if (weekly_message_count >= 3) {
        console.log('Free tier message quota exceeded');
        return new Response(
          JSON.stringify({
            error: 'PaymentRequiredError',
            details:
              'Free tier limited to 3 AI messages per week. Subscribe to unlock more.',
          }),
          {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

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

    // Get OpenAI API key
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Note: In Supabase Edge Functions, this works at runtime despite TypeScript errors
    const openai = new OpenAI({
      apiKey: openAiKey,
    });

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

    let completionResponse;
    try {
      completionResponse = await openai.chat.completions.create({
        model: 'gpt-4.1',
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
        temperature: 
          messageType === 'joke' ? 1.0 :
          messageType === 'gratitude' ? 0.88 :
          messageType === 'fact' ? 0.9 :
          messageType === 'custom' ? 0.8 : 
          0.75,
        presence_penalty: messageType === 'joke' || messageType === 'fact' ? 0.8 : messageType === 'gratitude' ? 0.7 : 0.6,
        frequency_penalty: messageType === 'joke' || messageType === 'fact' ? 0.7 : messageType === 'gratitude' ? 0.5 : 0.5,
      });
    } catch (error) {
      const err = error as Error;
      console.error('OpenAI API Error:', err.message);
      return new Response(
        JSON.stringify({
          error: 'Failed to generate message',
          details: err.message,
        }),
        { status: 500 }
      );
    }

    console.log('OpenAI Response:', {
      messageType,
      systemPrompt,
      userPrompt,
      response: completionResponse.choices[0].message?.content,
    });

    const message = completionResponse.choices[0].message?.content;
    if (!message) {
      throw new Error('No message was generated');
    }

    console.log('Generated message:', {
      messageType,
      messagePreview: message.substring(0, 50) + '...',
    });

    if (isFreeTier) {
      console.log(
        'Incrementing weekly message count from',
        weekly_message_count,
        'to',
        weekly_message_count + 1
      );
      try {
        const { error: updateError } = await supabaseAdminClient
          .from('profiles')
          .update({ weekly_message_count: weekly_message_count + 1 })
          .eq('id', user.id);
        if (updateError) {
          console.error(
            'Failed to increment weekly_message_count:',
            updateError
          );
        }
      } catch (error) {
        const err = error as Error;
        console.error('Exception updating weekly message count:', err.message);
      }
    }

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error as Error;
    console.error('Unexpected error:', err.message);

    let statusCode = 500;
    let errorMessage = 'An unexpected error occurred';

    if (err.message?.includes('quota') || err.message?.includes('rate limit')) {
      statusCode = 429;
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (
      err.message?.includes('authentication') ||
      err.message?.includes('key')
    ) {
      statusCode = 401;
      errorMessage = 'Authentication error with AI provider.';
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: err.message,
      }),
      { status: statusCode }
    );
  }
});
