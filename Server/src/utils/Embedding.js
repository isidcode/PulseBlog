import { InferenceClient } from "@huggingface/inference";

const client = new InferenceClient(process.env.HF_TOKEN) ;

try {
   const generateEmbedding = async (query)=>{
    const output = await client.featureExtraction({
      model: "sentence-transformers/all-MiniLM-L6-v2", 
      inputs: text,
    });

    return output;
   }  
} 
catch (error) {
    console.error("Hugging Face Embedding Error:", error);
    return null;
}