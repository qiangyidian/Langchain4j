package com.qiangi.consultant.config;

import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenAiConfig {

    @Value("${langchain4j.open-ai.chat-model.api-key}")
    private String apiKey;

    @Value("${langchain4j.open-ai.chat-model.base-url}")
    private String baseUrl;

    @Value("${langchain4j.open-ai.chat-model.model-name}")
    private String modelName;

    @Value("${langchain4j.open-ai.stream-chat-model.api-key}")
    private String streamApiKey;

    @Value("${langchain4j.open-ai.stream-chat-model.base-url}")
    private String streamBaseUrl;

    @Value("${langchain4j.open-ai.stream-chat-model.model-name}")
    private String streamModelName;

    @Value("${langchain4j.open-ai.stream-chat-model.log-requests}")
    private boolean streamLogRequests;

    @Value("${langchain4j.open-ai.stream-chat-model.log-responses}")
    private boolean streamLogResponses;

    @Bean
    public OpenAiChatModel openAiChatModel() {
        return OpenAiChatModel.builder()
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .modelName(modelName)
                .logRequests(true)      // 从 yml 读取，也可硬编码
                .logResponses(true)
                .build();
    }

    @Bean(name = "openAiStreamChatModel")
    public OpenAiStreamingChatModel openAiStreamChatModel() {
        return OpenAiStreamingChatModel.builder()
                .apiKey(streamApiKey)
                .baseUrl(streamBaseUrl)
                .modelName(streamModelName)
                .logRequests(streamLogRequests)
                .logResponses(streamLogResponses)
                .build();
    }
}
