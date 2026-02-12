package com.qiangi.consultant.controller;


import com.qiangi.consultant.aiservice.ConsultantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    @Autowired
    private ConsultantService consultantService;


    @RequestMapping("/chat")
    public String chat(@RequestParam("message") String message) {
        return consultantService.chat(message);
    }
//    @Autowired
//    private OpenAiChatModel model;
//
//
//    @RequestMapping("/chat")
//    public String chat(String message) {//浏览器传递的用户信息
//        return model.chat(message);
//    }

}
