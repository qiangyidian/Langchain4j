package com.qiangi.consultant.aiservice;

import dev.langchain4j.service.spring.AiService;
import dev.langchain4j.service.spring.AiServiceWiringMode;


@AiService(
        wiringMode = AiServiceWiringMode.EXPLICIT,
        chatModel = "openAiChatModel"
)
public interface ConsultantService {
    //用于聊天的方法
    public String chat(String message);
}
