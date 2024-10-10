const { OpenAI } = require("openai");
const { generarPrompt } = require("./prompt");

const openai = new OpenAI(
    {
        apiKey: 'sk-p2GmR_wqA_5oLHrNyF8v0gOGmhFH_of7FnhzzSJkuMT3BlbkFJnJ50T3fykjSxY9967B4te8BuC37p6SdsL4VfGWX-YA',
    }
);


const chat = async (nombre, historia) => {
    const prompt = generarPrompt(nombre);
    console.log(prompt);
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

module.exports = { chat }