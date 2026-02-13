package com.qiangi.consultant.aiservice;

import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.spring.AiService;
import dev.langchain4j.service.spring.AiServiceWiringMode;
import reactor.core.publisher.Flux;


@AiService(
        wiringMode = AiServiceWiringMode.EXPLICIT,
        chatModel = "openAiChatModel",
        streamingChatModel = "openAiStreamChatModel"
)
public interface ConsultantService {
    //用于聊天的方法
//    public String chat(String message);

    @SystemMessage(fromResource = "system.txt")
    @UserMessage("你是我的助手,你的态度要温柔仔细{{it}}")//这里的it是占位符,意思是input
    public Flux<String> chat(String message);
}
