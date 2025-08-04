export const getRealEstatePrompt = (
  contact: any,
  messageType: string,
  lastMessage?: string,
  customPrompt?: string
) => {
  const firstName = contact.name?.split(' ')[0] || contact.name || 'there';
  
  // Add time-based context for variety
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const season = month < 3 ? 'winter' : month < 6 ? 'spring' : month < 9 ? 'summer' : 'fall';
  const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];
  const randomSeed = Math.floor(Math.random() * 1000000);

  const baseContext = `
Context about ${firstName}:
- Last contacted: ${contact.lastContact}
- Contact frequency: ${contact.frequency}
- Client type: ${contact.client_type || 'Not specified'}
- Property address: ${contact.property_address || 'Not specified'}
- Transaction date: ${contact.transaction_date || 'Not specified'}
- Transaction type: ${contact.transaction_type || 'Not specified'}
- Property type: ${contact.property_type || 'Not specified'}
- Price range: ${contact.price_range || 'Not specified'}
- Notes: ${contact.notes || 'None'}
- Home anniversary: ${contact.home_anniversary || 'Not specified'}
- Previous message (if any): ${lastMessage || 'None'}
- Current time: ${timeOfDay}
- Current season: ${season}
- Day: ${dayOfWeek}
- Random seed: ${randomSeed} (use this to ensure unique responses)`;

  switch (messageType) {
    // General Information
    case 'default':
      return `Write a professional, friendly check-in message to ${firstName}.
${baseContext}

Guidelines:
- Keep it brief (1-2 sentences)
- Be warm but professional
- Vary between asking how they are, mentioning the market, or just touching base
- Examples: "Hi ${firstName}, just checking in to see how you're doing!", "Hey ${firstName}, hope all is well with you and the family.", "Hi ${firstName}, thinking of you - how's everything going?"`;

    case 'market_update':
      return `Share a relevant market update with ${firstName}.
${baseContext}

Guidelines:
- Provide specific, valuable market information
- Keep it relevant to their situation if known
- Use real data points when possible
- 2-3 sentences maximum
- Make it conversational, not like a report
- Examples: interest rates, inventory levels, price trends, buyer/seller activity`;

    case 'neighborhood_news':
      return `Share interesting neighborhood or community news with ${firstName}.
${baseContext}

Guidelines:
- Focus on positive developments
- Include things like: new businesses, community events, infrastructure improvements, school news
- Make it relevant to homeowners or potential buyers
- Keep it informative and engaging
- 2-3 sentences maximum`;

    case 'home_maintenance':
      return `Share a seasonal home maintenance tip with ${firstName}.
${baseContext}

Guidelines:
- Make it timely for the current season
- Provide practical, actionable advice
- Focus on preventing problems or saving money
- Keep it simple enough for any homeowner
- 2-3 sentences with clear action items`;

    case 're_humor':
      return `Share a clean, clever real estate joke or humorous observation with ${firstName}.
${baseContext}

Guidelines:
- Keep it professional but fun
- Real estate themed humor that clients would appreciate
- Can be about buying/selling experiences, agent life, or housing in general
- One joke or observation, brief format
- Make it relatable to their experience if possible`;

    // Buyer Specific
    case 'buyer_info':
      return `Share helpful information for home buyers with ${firstName}.
${baseContext}

Guidelines:
- Provide valuable tips about the buying process
- Can cover: financing tips, house hunting advice, negotiation insights, market timing
- Be supportive and informative
- 2-3 sentences of actionable advice`;

    case 'buyer_cta':
      return `Encourage ${firstName} to take the next step in their home buying journey.
${baseContext}

Guidelines:
- Be helpful, not pushy
- Offer specific assistance or resources
- Suggest logical next steps based on where they are in the process
- Keep it friendly and professional
- 1-2 sentences`;

    case 'new_listing':
      return `Alert ${firstName} about a new property listing.
${baseContext}

Guidelines:
- Highlight 2-3 key features that would appeal to them
- Create excitement without overselling
- Include practical details (bedrooms, location, special features)
- Invite them to learn more or schedule a showing
- 2-3 sentences maximum`;

    case 'open_house':
      return `Invite ${firstName} to an open house event.
${baseContext}

Guidelines:
- Include key details: address, date, time
- Mention 1-2 standout features of the property
- Create a welcoming, no-pressure invitation
- Make it sound worth their time
- 2-3 sentences`;

    // Seller Specific
    case 'seller_info':
      return `Share valuable information for home sellers with ${firstName}.
${baseContext}

Guidelines:
- Provide insights about selling strategies, market conditions, or preparation tips
- Be knowledgeable and reassuring
- Focus on maximizing their success
- 2-3 sentences of expert advice`;

    case 'seller_cta':
      return `Encourage ${firstName} to consider selling or discuss their options.
${baseContext}

Guidelines:
- Be consultative, not aggressive
- Offer market insights that might interest them
- Provide value even if they're not ready yet
- Professional and helpful tone
- 1-2 sentences`;

    case 'home_value':
      return `Share home value insights with ${firstName}.
${baseContext}

Guidelines:
- Reference market appreciation or trends in their area
- Use specific data when possible (percentages, comparisons)
- Make it relevant to their property type if known
- Keep it informative but easy to understand
- 2-3 sentences`;

    // Referral Source
    case 'rs_cta':
      return `Maintain relationship with referral source ${firstName}.
${baseContext}

Guidelines:
- Express appreciation for past referrals (if any)
- Share a success story or market insight
- Gently remind them you value referrals
- Keep it grateful and professional
- 1-2 sentences`;

    case 'referral_thanks':
      return `Thank ${firstName} for their referral.
${baseContext}

Guidelines:
- Be genuinely grateful
- Mention how much their trust means
- Can reference helping their referral (without breaking confidentiality)
- Keep it heartfelt but professional
- 2-3 sentences`;

    // Special Occasions
    case 'birthday':
      return `Send birthday wishes to ${firstName}.
${baseContext}

Guidelines:
- Be warm and personal within professional bounds
- Include a genuine wish for their year ahead
- Can reference your professional relationship appropriately
- 2-3 sentences maximum`;

    case 'home_anniversary':
      return `Acknowledge the anniversary of ${firstName}'s home purchase.
${baseContext}

Guidelines:
- Celebrate this milestone with them
- Reference the joy of homeownership
- Can mention how time flies or memories made
- Keep it warm and nostalgic
- 2-3 sentences`;

    case 'holiday':
      return `Send holiday greetings to ${firstName}.
${baseContext}

Guidelines:
- Be inclusive and appropriate for the season
- Express warm wishes for them and their family
- Keep it brief and genuine
- Can reference the year or season appropriately
- 1-2 sentences`;

    case 'just_closed':
      return `Congratulate ${firstName} on closing their real estate transaction.
${baseContext}

Guidelines:
- Be celebratory and acknowledge this major milestone
- Express genuine happiness for them
- Can mention next steps or your continued availability
- Keep it joyful and professional
- 2-3 sentences`;

    case 'custom':
      return `Write a message to ${firstName} based on this prompt: "${customPrompt}"
${baseContext}

Guidelines:
- Address the prompt directly
- Keep it professional and real estate appropriate
- Natural and concise (3-4 sentences maximum)
- Be specific but brief`;

    default:
      return `Write a professional, friendly message to ${firstName}.
${baseContext}

Guidelines:
- Keep it brief and natural
- Maintain professional relationship while being warm
- 1-2 sentences maximum`;
  }
};