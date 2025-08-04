import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
// For Deno in Supabase Edge Functions, this import will work at runtime despite TypeScript errors
import OpenAI from 'npm:openai@4.28.0';
import { getRealEstatePrompt } from './prompts.ts';

interface MessageRequest {
  contact: {
    name: string;
    lastContact: string;
    frequency: string;
    client_type?: 'buyer' | 'seller' | 'referral_source' | 'past_client' | 'prospect';
    property_address?: string;
    transaction_date?: string;
    transaction_type?: 'purchase' | 'sale' | 'both';
    property_type?: 'single_family' | 'condo' | 'townhouse' | 'land' | 'commercial';
    price_range?: string;
    notes?: string;
    home_anniversary?: string;
    include_emojis?: boolean;
  };
  lastMessage?: string;
  messageType?:
    | 'default'
    | 'market_update'
    | 'neighborhood_news'
    | 'home_maintenance'
    | 're_humor'
    | 'buyer_info'
    | 'buyer_cta'
    | 'new_listing'
    | 'open_house'
    | 'seller_info'
    | 'seller_cta'
    | 'home_value'
    | 'rs_cta'
    | 'referral_thanks'
    | 'birthday'
    | 'home_anniversary'
    | 'holiday'
    | 'just_closed'
    | 'custom'
    // Legacy types for compatibility
    | 'love'
    | 'gratitude'
    | 'joke'
    | 'fact';
  customPrompt?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const getSystemPrompt = (messageType: string, includeEmojis: boolean = true) => {
  const emojiNote = includeEmojis ? '' : ' Do not use any emojis in your response.';
  
  switch (messageType) {
    // General Information
    case 'default':
      return `You are a professional real estate agent writing a casual check-in message to maintain client relationships. Keep it brief (1-2 sentences), professional yet warm, and natural-sounding.${emojiNote}`;
    case 'market_update':
      return `You are a knowledgeable real estate professional sharing market insights. Provide valuable, current market information in 2-3 sentences. Be specific but accessible to non-experts.${emojiNote}`;
    case 'neighborhood_news':
      return `You are sharing relevant neighborhood or community updates that would interest homeowners or potential buyers. Keep it informative and positive, 2-3 sentences max.${emojiNote}`;
    case 'home_maintenance':
      return `You are providing helpful, seasonal home maintenance tips. Be practical and specific, offering advice homeowners can actually use. Limit to 2-3 actionable sentences.${emojiNote}`;
    case 're_humor':
      return `You are sharing clean, clever real estate humor that both agents and clients would appreciate. Keep it light, relatable, and professional. One joke or observation, brief format.${emojiNote}`;
    
    // Buyer Specific
    case 'buyer_info':
      return `You are providing valuable information to home buyers about the buying process, market conditions, or tips. Be informative and supportive, 2-3 sentences.${emojiNote}`;
    case 'buyer_cta':
      return `You are encouraging potential buyers to take action while being helpful, not pushy. Suggest next steps or offer assistance. Keep it friendly and professional, 1-2 sentences.${emojiNote}`;
    case 'new_listing':
      return `You are alerting buyers to new property listings that might interest them. Be specific about key features while maintaining excitement. 2-3 sentences max.${emojiNote}`;
    case 'open_house':
      return `You are inviting clients to an open house event. Include key details (when, where) while building interest. Keep it welcoming and informative, 2-3 sentences.${emojiNote}`;
    
    // Seller Specific
    case 'seller_info':
      return `You are providing valuable information to home sellers about market conditions, selling tips, or process updates. Be knowledgeable and reassuring, 2-3 sentences.${emojiNote}`;
    case 'seller_cta':
      return `You are encouraging potential sellers to consider listing while being consultative, not aggressive. Offer market insights or assistance. Professional and helpful, 1-2 sentences.${emojiNote}`;
    case 'home_value':
      return `You are sharing home value insights or market appreciation updates. Be specific with data when possible, but keep it relevant and easy to understand. 2-3 sentences.${emojiNote}`;
    
    // Referral Source
    case 'rs_cta':
      return `You are maintaining relationships with referral sources by offering value and gently reminding them you appreciate referrals. Be grateful and professional, 1-2 sentences.${emojiNote}`;
    case 'referral_thanks':
      return `You are thanking someone for a referral. Be genuinely grateful and specific about the value of their trust. Keep it heartfelt but professional, 2-3 sentences.${emojiNote}`;
    
    // Special Occasions
    case 'birthday':
      return `You are sending warm birthday wishes as a real estate professional. Be personal but maintain professionalism. Include a genuine wish for their year ahead, 2-3 sentences.${emojiNote}`;
    case 'home_anniversary':
      return `You are acknowledging the anniversary of their home purchase. Be warm and help them celebrate this milestone. Reference the joy of homeownership, 2-3 sentences.${emojiNote}`;
    case 'holiday':
      return `You are sending holiday greetings as a real estate professional. Be inclusive, warm, and appropriate for the season. Keep it brief and genuine, 1-2 sentences.${emojiNote}`;
    case 'just_closed':
      return `You are congratulating clients on closing their real estate transaction. Be celebratory and acknowledge this major milestone. Express genuine happiness for them, 2-3 sentences.${emojiNote}`;
    
    // Custom
    case 'custom':
      return `You are writing a personalized real estate-related message based on a specific prompt. Keep it professional, natural, and concise, limited to 3-4 sentences max.${emojiNote}`;
    
    // Legacy types mapped to new ones
    case 'love':
      return getSystemPrompt('market_update', includeEmojis);
    case 'gratitude':
      return getSystemPrompt('home_anniversary', includeEmojis);
    case 'joke':
      return getSystemPrompt('re_humor', includeEmojis);
    case 'fact':
      return getSystemPrompt('neighborhood_news', includeEmojis);
    default:
      return getSystemPrompt('default', includeEmojis);
  }
};

const getPrompt = (
  contact: any,
  messageType: string,
  lastMessage?: string,
  customPrompt?: string
) => {
  // Map legacy types to new ones
  const typeMapping: Record<string, string> = {
    'love': 'market_update',
    'gratitude': 'home_anniversary',
    'joke': 're_humor',
    'fact': 'neighborhood_news'
  };
  
  messageType = typeMapping[messageType] || messageType;
  
  // Use the new real estate focused prompts
  return getRealEstatePrompt(contact, messageType, lastMessage, customPrompt);
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

    const systemPrompt = getSystemPrompt(messageType, contact.include_emojis ?? true);
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
