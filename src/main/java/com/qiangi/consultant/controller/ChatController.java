package com.qiangi.consultant.controller;


import dev.langchain4j.model.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {
    @Autowired
    private OpenAiChatModel model;


    @RequestMapping("/chat")
    public String chat(String message) {//浏览器传递的用户信息
        return model.chat(message);
    }

}
