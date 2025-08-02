import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import OpenAI from 'npm:openai@4.28.0';

interface ScheduledMessage {
  id: string;
  user_id: string;
  contact_id: string;
  message_type: string;
  custom_prompt?: string;
  scheduled_time: string;
  contact?: {
    id: string;
    name: string;
    last_contact: string;
    frequency: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get OpenAI API key
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      console.error('OPENAI_API_KEY is not set');
      throw new Error('OPENAI_API_KEY is not set');
    }

    const openai = new OpenAI({
      apiKey: openAiKey,
    });

    // Get all pending scheduled messages that are due
    const { data: scheduledMessages, error: fetchError } = await supabaseAdmin
      .from('scheduled_messages')
      .select(`
        *,
        contact:contacts!scheduled_messages_contact_id_fkey (
          id,
          name,
          phone,
          last_contact,
          frequency
        )
      `)
      .eq('status', 'pending')
      .lte('scheduled_time', new Date().toISOString())
      .limit(50); // Process up to 50 messages at a time

    if (fetchError) {
      console.error('Error fetching scheduled messages:', fetchError);
      throw fetchError;
    }

    if (!scheduledMessages || scheduledMessages.length === 0) {
      console.log('No scheduled messages to process');
      return new Response(
        JSON.stringify({ message: 'No scheduled messages to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${scheduledMessages.length} scheduled messages`);

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as any[],
    };

    // Process each scheduled message
    for (const message of scheduledMessages) {
      try {
        if (!message.contact) {
          throw new Error(`Contact not found for message ${message.id}`);
        }

        // Generate message content
        let messageContent = message.message_content;
        
        if (!messageContent) {
          const systemPrompt = getSystemPrompt(message.message_type);
          const userPrompt = getPrompt(
            message.contact,
            message.message_type,
            message.custom_prompt
          );

          const completionResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
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
            max_tokens: message.message_type === 'gratitude' ? 500 : 250,
            temperature: 
              message.message_type === 'joke' ? 1.0 :
              message.message_type === 'gratitude' ? 0.88 :
              message.message_type === 'fact' ? 0.9 :
              message.message_type === 'custom' ? 0.8 : 
              0.75,
            presence_penalty: message.message_type === 'joke' || message.message_type === 'fact' ? 0.8 : message.message_type === 'gratitude' ? 0.7 : 0.6,
            frequency_penalty: message.message_type === 'joke' || message.message_type === 'fact' ? 0.7 : message.message_type === 'gratitude' ? 0.5 : 0.5,
          });

          messageContent = completionResponse.choices[0].message?.content;
          if (!messageContent) {
            throw new Error('No message was generated');
          }
        }

        // Get push token for the user
        const { data: pushTokens, error: pushTokenError } = await supabaseAdmin
          .from('push_tokens')
          .select('token')
          .eq('user_id', message.user_id)
          .limit(1);

        // Send push notification if user has a push token
        if (pushTokens && pushTokens.length > 0) {
          const notificationData = {
            to: pushTokens[0].token,
            sound: 'default',
            title: `Message for ${message.contact.name}`,
            body: messageContent,
            data: {
              contactId: message.contact_id,
              messageType: 'scheduled',
              messageContent: messageContent,
              contactPhone: message.contact.phone,
            },
          };

          try {
            const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(notificationData),
            });

            if (!pushResponse.ok) {
              console.error('Failed to send push notification:', await pushResponse.text());
            }
          } catch (pushError) {
            console.error('Error sending push notification:', pushError);
            // Continue processing even if push fails
          }
        }

        // Note: Contact's last_contact is already updated when the message is scheduled,
        // so we don't need to update it again here when the message is sent.
        console.log(`Processing scheduled message for ${message.contact.name} - timer was already updated when scheduled`);

        // Mark scheduled message as sent
        const { error: messageUpdateError } = await supabaseAdmin
          .from('scheduled_messages')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            message_content: messageContent,
          })
          .eq('id', message.id);

        if (messageUpdateError) {
          console.error('Error updating scheduled message:', messageUpdateError);
          throw messageUpdateError;
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
        console.error(`Detailed error for message ${message.id}:`, errorMessage);
        results.errors.push({
          messageId: message.id,
          error: errorMessage,
        });

        // Mark message as failed
        await supabaseAdmin
          .from('scheduled_messages')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', message.id);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        message: 'Scheduled messages processed',
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error('Unexpected error:', err.message);

    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred',
        details: err.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});