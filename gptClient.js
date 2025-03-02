const OpenAI = require('openai');

const defaultMessage = "What's in this screenshot?";

class GPTClient {
    constructor(apiKey, model = 'gpt-4-vision-preview') {
        if (!apiKey) {
            throw new Error('OpenAI API key is required');
        }
        this.openai = new OpenAI({ apiKey });
        this.model = model;
        this.resetConversation();
    }

    resetConversation() {
        this.messages = [];
    }

    async analyzeScreenshot(imageData, message) {
        try {
            // If this is a new conversation (no messages)
            if (this.messages.length === 0) {
                // Create content array based on whether we have an image
                const content = imageData ? [
                    { type: "text", text: message },
                    {
                        type: "image_url",
                        image_url: {
                            url: imageData
                        }
                    }
                ] : message;

                this.messages.push({
                    role: "user",
                    content: content
                });
            } else {
                // For follow-up questions, just add the text
                this.messages.push({
                    role: "user",
                    content: message
                });
            }

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: this.messages,
                max_tokens: 4096,
            });

            const assistantMessage = response.choices[0].message;
            
            // Add assistant's response to conversation history
            this.messages.push(assistantMessage);
            
            return assistantMessage.content;
        } catch (error) {
            console.error('GPT API Error:', error);
            throw error;
        }
    }
}

module.exports = GPTClient; 