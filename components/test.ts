const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
    apiKey: "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",
});
export const openai = new OpenAIApi(configuration);
async function main() {
    const chatCompletion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: "Hello world" }],
    });
    console.log(chatCompletion.data.choices[0].message);
}
main();