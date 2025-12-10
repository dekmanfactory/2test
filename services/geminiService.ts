import { GoogleGenAI, Type, Schema } from "@google/genai";
import { TestCase, TestStep, TestStatus } from "../types";

// Removed static initialization: const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const testCaseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    testCases: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "A concise title for the test case in Korean" },
          description: { type: Type.STRING, description: "Brief objective of the test in Korean" },
          priority: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING, description: "The step action to perform in Korean" },
                expectedResult: { type: Type.STRING, description: "The expected outcome of the step in Korean" }
              },
              required: ["action", "expectedResult"]
            }
          }
        },
        required: ["title", "priority", "steps"]
      }
    }
  }
};

const simulationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    status: { type: Type.STRING, enum: ["PASSED", "FAILED", "SKIPPED"] },
    logs: { type: Type.STRING, description: "Detailed technical execution logs and observations in Korean" }
  },
  required: ["status", "logs"]
};

export const generateTestCases = async (featureDescription: string, contextInfo?: string): Promise<Partial<TestCase>[]> => {
  try {
    // Dynamic initialization
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      You are an expert QA Automation Engineer fluent in Korean (한국어).
      
      Target Application Context: ${contextInfo || "General Software Application"}
      
      Task: Generate a comprehensive list of test cases for the following feature/data:
      "${featureDescription}"
      
      Requirements:
      1. Analyze the input feature or data.
      2. Generate test cases covering positive, negative, and edge cases.
      3. CRITICAL: All user-facing text (Titles, Descriptions, Actions, Expected Results) MUST be written in Korean (한국어).
      4. If the context is a Website, assume standard browser interactions.
      5. If the context is a Desktop App, assume standard window/OS interactions.
      
      Return the response in strictly structured JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: testCaseSchema,
        systemInstruction: "You are a helpful QA assistant that generates high-quality software test cases in Korean.",
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const parsed = JSON.parse(jsonText);
    const rawCases = parsed.testCases || [];

    // Map to our internal format with UUIDs
    return rawCases.map((rc: any) => ({
      id: crypto.randomUUID(),
      title: rc.title,
      description: rc.description || "",
      priority: rc.priority as 'Low' | 'Medium' | 'High',
      steps: rc.steps.map((s: any) => ({
        id: crypto.randomUUID(),
        action: s.action,
        expectedResult: s.expectedResult
      }))
    }));

  } catch (error) {
    console.error("Failed to generate test cases:", error);
    throw error;
  }
};

export const simulateTestExecution = async (testCase: TestCase, contextInfo: string): Promise<{ status: TestStatus, notes: string }> => {
  try {
    // Dynamic initialization
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const stepsText = testCase.steps.map((s, i) => `${i + 1}. ${s.action} -> Expect: ${s.expectedResult}`).join('\n');
    
    const prompt = `
      Role: Autonomous Test Agent
      Task: Simulate the execution of a software test case and determine the result.
      
      Context: ${contextInfo}
      Test Case: "${testCase.title}"
      Steps:
      ${stepsText}
      
      Instructions:
      1. Act as if you are executing these steps on the real application.
      2. Generate a realistic execution log (in Korean) describing what happened.
      3. Determine the outcome (PASSED, FAILED, or SKIPPED).
      4. Bias towards PASSED (approx 80%), but introduce realistic failures (20%) for negative scenarios or complex edge cases.
      
      Return strictly JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: simulationSchema,
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    const result = JSON.parse(jsonText);
    return {
      status: result.status as TestStatus,
      notes: result.logs
    };

  } catch (error) {
    console.error("Simulation failed:", error);
    return { status: 'SKIPPED', notes: 'AI 시뮬레이션 실패' };
  }
};