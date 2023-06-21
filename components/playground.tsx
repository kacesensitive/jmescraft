"use client";
import React, { useState, useCallback } from "react";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { FaCheck, FaTimes, FaSpinner, FaUpload, FaExclamationTriangle } from "react-icons/fa";
import { useToast } from "./ui/use-toast";
import { ToastAction } from "@radix-ui/react-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useDropzone } from 'react-dropzone';
import jmespath from "jmespath";
import { Configuration, OpenAIApi, CreateChatCompletionRequest, ChatCompletionRequestMessageRoleEnum } from "openai";

function Playground() {
    const [apiKeyEntered, setApiKeyEntered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState<string>("");
    const [apiKey, setApiKey] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [jsonInput, setJsonInput] = useState<string>("");
    const [jmesPathQuery, setJmesPathQuery] = useState("");
    const [jmesPathResult, setJmesPathResult] = useState<string | null>(null);
    const [jmesPathError, setJmesPathError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState("");
    const [generatedJmesPath, setGeneratedJmesPath] = useState("");
    const [isQueryLoading, setIsQueryLoading] = useState(false);
    const { toast } = useToast();

    function generateJsonSchema(json: any): any {
        if (Array.isArray(json)) {
            return [generateJsonSchema(json[0])];
        } else if (typeof json === 'object' && json !== null) {
            const schema: any = {};
            for (const key in json) {
                schema[key] = generateJsonSchema(json[key]);
            }
            return schema;
        } else {
            return typeof json;
        }
    }


    const handleJmesPathChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setJmesPathQuery(query);
        try {
            const result = jmespath.search(JSON.parse(jsonInput), query);
            setJmesPathResult(JSON.stringify(result, null, 2));
            setJmesPathError(null);
        } catch (err) {
            // @ts-ignore
            setJmesPathError(err.message);
        }
    }, [jsonInput]);

    const handleJsonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const content = e.target.value;
        setJsonInput(content);
        try {
            const json = JSON.parse(content);
            setFileContent(JSON.stringify(json, null, 2));
            setJsonError(null);
        } catch (err) {
            setJsonError('Invalid JSON');
        }
    }, []);

    const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setApiKey(e.target.value);
    }, []);

    const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setPrompt(e.target.value);
    }, []);

    const handleButtonClick = useCallback(async () => {
        const configuration = new Configuration({
            apiKey: apiKey,
        });
        const openai = new OpenAIApi(configuration);
        setIsLoading(true);
        try {
            const engineList = await openai.listEngines();
            if (engineList) {
                setIsLoading(false);
                setApiKeyEntered(true);
            } else {
                setIsLoading(false);
                setApiKeyEntered(false);
                setError('Invalid API Key');
                toast({
                    title: "Error occurred",
                    // @ts-ignore
                    description: err.message,
                    action: (
                        <ToastAction altText="Try again">Try again</ToastAction>
                    ),
                });
            }
        } catch (error) {
            console.error('Error:', error);
            setIsLoading(false);
            //@ts-ignore
            setError(error.message);
            toast({
                title: "Error occurred",
                // @ts-ignore
                description: error.message,
                action: (
                    <ToastAction altText="Try again">Try again</ToastAction>
                ),
            });
        }
    }, [toast, apiKey]);

    const handleGenerateQuery = useCallback(async () => {
        const configuration = new Configuration({
            apiKey: apiKey,
        });
        const openai = new OpenAIApi(configuration);
        setIsQueryLoading(true);
        try {
            let jsonSchema;
            try {
                jsonSchema = generateJsonSchema(JSON.parse(jsonInput));
            } catch (err) {
                setJsonError('Invalid JSON');
                setIsQueryLoading(false);
                return;
            }
            const chatCompletion: CreateChatCompletionRequest = {
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: ChatCompletionRequestMessageRoleEnum.System,
                        content: 'You are a helpful assistant.'
                    },
                    {
                        role: ChatCompletionRequestMessageRoleEnum.User,
                        content: `I need a jmespath query, only reply with the raw jmespath query. The json spec to follow is ${JSON.stringify(jsonSchema)} and I need the query to: ${prompt}. only reply with the raw jmespath query ONLY RESPOND WITH RAW JMESPATH QUERY`
                    }
                ]
            };
            const result = await openai.createChatCompletion(chatCompletion);
            //@ts-ignore
            const choice = result.data.choices[0];
            //@ts-ignore
            let generatedQuery = choice.message.content;
            // @ts-ignore
            generatedQuery = generatedQuery.replace(/['"`]+/g, '');
            setGeneratedJmesPath(generatedQuery);
            setJmesPathQuery(generatedQuery);
            //@ts-ignore
            const jmesResult = jmespath.search(JSON.parse(jsonInput), generatedQuery);
            setJmesPathResult(JSON.stringify(jmesResult, null, 2));
            setIsQueryLoading(false);
            setJmesPathError(null);
        } catch (error) {
            setIsQueryLoading(false);
            console.error('Error:', error);
            //@ts-ignore
            setError(error.message);
            toast({
                title: "Error occurred",
                // @ts-ignore
                description: error.message,
                action: (
                    <ToastAction altText="Try again">Try again</ToastAction>
                ),
            });
        }
    }, [toast, jsonInput, prompt]);


    const { getRootProps, getInputProps, open } = useDropzone({
        accept: {}, // correct file type for JSON files
        onDrop: useCallback((acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            const reader = new FileReader();

            reader.onabort = () => console.log('file reading was aborted');
            reader.onerror = () => console.log('file reading has failed');
            reader.onload = () => {
                setJsonInput(reader.result as string);
            }
            reader.readAsText(file);
        }, []),
        noClick: true
    });

    return (
        <TooltipProvider>
            <div className="border rounded-lg p-4 border-green-400 flex flex-col bg-background h-[90vh]">
                <div className="flex items-center mb-4 justify-center">
                    <Input
                        type="text"
                        placeholder="Enter OpenAI API Key here"
                        className="border-green-400 w-[85%]"
                        value={apiKey}
                        onChange={handleApiKeyChange}
                    />                  <Button
                        onClick={handleButtonClick}
                        className={`w-28 ml-3 ${apiKeyEntered ? 'bg-green-500' : error ? 'bg-red-500' : ''}`}
                    >
                        <div className="flex items-center justify-center">
                            {isLoading ? (
                                <FaSpinner className="animate-spin" />
                            ) : apiKeyEntered ? (
                                <FaCheck />
                            ) : error ? (
                                <Tooltip>
                                    <TooltipTrigger>
                                        <FaTimes />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>{error}</p>
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                'Verify'
                            )}
                        </div>
                    </Button>
                    {error &&
                        <Tooltip>
                            <TooltipTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{error}</p>
                            </TooltipContent>
                        </Tooltip>
                    }
                </div>
                <div className="flex items-center mb-4 justify-center">
                    <Input
                        type="text"
                        placeholder="Enter your JMESPath query prompt here"
                        className="border-green-400 w-[85%]"
                        value={prompt}
                        onChange={handlePromptChange}
                        disabled={!apiKeyEntered || !apiKey || !jsonInput || !!jsonError}
                    />
                    <Button
                        onClick={handleGenerateQuery}
                        className={`w-28 ml-3 ${isQueryLoading ? 'bg-blue-500' : ''}`}
                        disabled={!apiKeyEntered || !apiKey || !jsonInput || !!jsonError}
                    >
                        <div className="flex items-center justify-center">
                            {isQueryLoading ? (
                                <FaSpinner className="animate-spin" />
                            ) : (
                                'Submit Query'
                            )}
                        </div>
                    </Button>
                </div>
                <div className="flex flex-grow">
                    <div {...getRootProps()} className="flex-1 pr-2 rounded relative">
                        <input {...getInputProps()} />
                        <Textarea placeholder="Your JSON content here" className="h-full border-green-400 w-[102%]" value={jsonInput} onChange={handleJsonChange} />
                        {jsonError &&
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <FaExclamationTriangle className="absolute top-2 right-2 text-red-500" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    {jsonError}
                                </TooltipContent>
                            </Tooltip>
                        }

                        {!jsonInput &&
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                <p>Drop JSON file here, or click the upload button</p>
                                <Button onClick={open} className="mt-4"><FaUpload /> Upload</Button>
                            </div>
                        }

                    </div>
                    <div className="flex-1 pl-2 flex flex-col space-y-2">
                        <Input placeholder="JMESPath query." className="border-green-400" value={jmesPathQuery} onChange={handleJmesPathChange} />
                        <Textarea placeholder="Query result will appear here." className={`flex-grow border-green-400 ${jmesPathError ? 'text-red-500' : ''}`} value={jmesPathResult || jmesPathError || ''} />
                    </div>
                </div>
            </div>
        </TooltipProvider>
    );
}

export default Playground;
