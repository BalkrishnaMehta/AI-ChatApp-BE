const smartReplierTemplate = `# Conversation Reply Generator
    You are given a list of messages from a conversation. Your task is to understand the context of the conversation and then generate 3 possible replies to the last message in the style and language of the receiver.

    ## Format Requirements:
    - Only output a JSON object with a single key "replies" containing an array of 3 reply strings
    - No extra text before or after the JSON
    - No explanations
    - No user labels
    - Respect the language of the conversation (English, Hindi, Gujarati, Hinglish, etc.)
    - Capture the tone, style, and context of the conversation particularly in the use of formal (e.g., "aap") or informal (e.g., "tu") address.
    - [HIGH PRIORITY] Always respond in the exact language of the last message. If unsure, generate a response using a combination of the languages you are uncertain about.

    ## Examples:

    ### Example 1 (English):
    **Conversation:**
    \`\`\`
    [
      {{"sender": "Alex", "message": "Hey, how's your day going?"}},
      {{"sender": "Jamie", "message": "Pretty good! Just finished that project I was telling you about."}},
      {{"sender": "Alex", "message": "That's awesome! How did the presentation go?"}}
    ]
    \`\`\`

    **Output:**
    \`\`\`json
    {{
      "replies": [
        "It went really well! My boss loved the design elements we added last minute.",
        "Thanks for asking! It was a bit nerve-wracking but everyone seemed impressed with our work.",
        "Better than expected actually! They want us to present to the executive team next week."
      ]
    }}
    \`\`\`

    ### Example 2 (Hinglish):
    **Conversation:**
    \`\`\`
    [
      {{"sender": "Priya", "message": "Kal movie dekhne chalein?"}},
      {{"sender": "Raj", "message": "Haan, but mujhe thoda late ho jayega office se."}},
      {{"sender": "Priya", "message": "Koi baat nahi. Kitne baje tak pahunch paoge?"}}
    ]
    \`\`\`

    **Output:**
    \`\`\`json
    {{
      "replies": [
        "Shayad 7:30 tak. Traffic ka depend karta hai.",
        "8 baje tak pakka pahunch jaunga. Last show le lete hain?",
        "Office se 6:30 niklunga toh 7:45 tak aa jaunga. Chalega?"
      ]
    }}
    \`\`\`

    ### Example 3 (Hindi):
    **Conversation:**
    \`\`\`
    [
      {{"sender": "आदित्य", "message": "नमस्ते! आज की मीटिंग कैसी रही?"}},
      {{"sender": "रोहित", "message": "बहुत अच्छी! सभी प्रोजेक्ट अपडेट पर चर्चा हुई।"}},
      {{"sender": "आदित्य", "message": "क्या हमारे प्रोजेक्ट को मंजूरी मिल गई?"}}
    ]
    \`\`\`

    **Output:**
    \`\`\`json
    {{
      "replies": [
        "हां, हमारे प्रोजेक्ट को मंजूरी मिल गई! अगले हफ्ते से काम शुरू कर सकते हैं।",
        "जी हां, मैनेजर ने हमारे प्लान को पसंद किया। बजट भी स्वीकृत हो गया है।",
        "हां, लेकिन कुछ बदलाव करने होंगे। कल मैं आपको डिटेल्स भेज दूंगा।"
      ]
    }}
    \`\`\`

    ### Example 4 (Gujarati):
    **Conversation:**
    \`\`\`
    [
      {{"sender": "કિરણ", "message": "આવતા રવિવારે પરિવાર સાથે પિકનિક પર જઈએ?"}},
      {{"sender": "દીપા", "message": "હા, સરસ વિચાર છે! ક્યાં જવાનું વિચાર્યું છે?"}},
      {{"sender": "કિરણ", "message": "કંચનજંગા વૉટર પાર્ક કેવું રહેશે? બાળકોને પણ મજા આવશે."}}
    ]
    \`\`\`

    **Output:**
    \`\`\`json
    {{
      "replies": [
        "હા, એ જગ્યા ખૂબ સરસ છે! આપણે સવારે 9 વાગ્યે નીકળીએ તો કેવું?",
        "મને પણ એજ વિચાર આવ્યો હતો! હું થોડા નાસ્તાની વ્યવસ્થા કરીશ.",
        "બિલકુલ, બાળકોને ખૂબ મઝા આવશે. આપણે લંચ પણ સાથે લઈ જઈએ."
      ]
    }}

    Now for following {conversation} generate 3 replies.
    \`\`\`
  `;

export default smartReplierTemplate;
