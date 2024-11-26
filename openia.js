const { OpenAI } = require("openai");
const { generarPrompt, generaPromptDetermine } = require("./prompt");

const openai = new OpenAI(
    {
        apiKey: '',
    }
);


const chat = async (nombre, historia) => {
    const prompt = generarPrompt(nombre);
    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", 
                content: prompt
            },
            ...historia,
        ],
        temperature: 1,
        max_tokens: 800,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    });
    return completion.choices[0].message.content;
}

const chatDeterminar = async (historia) => {
    const prompt = generaPromptDetermine();
    const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            { role: "system", 
                content: prompt
            },
            ...historia,
        ],
        temperature: 1,
        max_tokens: 800,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
    });
    return completion.choices[0].message.content;
}

module.exports = { chat, chatDeterminar }
