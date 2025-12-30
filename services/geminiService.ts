import { GoogleGenAI } from "@google/genai";
import { BondData } from "../types";

const createClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY is not set in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeBondWithAI = async (bond: BondData): Promise<string> => {
  const client = createClient();
  if (!client) return "请配置 API KEY 以使用 AI 分析功能。";

  const prompt = `
    你是一位专业的中国可转债(Convertible Bond)市场分析师。
    请根据以下数据分析该可转债的投资价值：
    
    名称: ${bond.name} (${bond.code})
    当前价格: ${bond.price}
    转股溢价率: ${bond.premiumRate}%
    双低值: ${bond.doubleLow}
    评级: ${bond.rating}
    剩余年限: ${bond.remainingYear}年
    正股涨跌幅: ${bond.stockChange}%

    请简要给出以下几点分析（200字以内）：
    1. 安全性评估（基于价格和评级）
    2. 进攻性评估（基于溢价率和正股表现）
    3. 综合建议（适合哪类投资者，保守/激进/观望）
    
    请使用Markdown格式返回，重点部分加粗。
  `;

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "AI 分析未返回内容。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 分析服务暂时不可用，请稍后再试。";
  }
};