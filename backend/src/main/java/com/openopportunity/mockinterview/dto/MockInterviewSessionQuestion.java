package com.openopportunity.mockinterview.dto;

import com.openopportunity.mockinterview.QuestionDifficulty;
import java.util.List;

/** One question in a generated session, already in the order the candidate should be asked — see
 * MockInterviewQuestionService.getSessionQuestions, which sorts easy to very difficult. skills is
 * the subset of skills this specific question tests (empty for a general/behavioral question),
 * surfaced on MockInterviewPage so the candidate knows what a question is probing. difficulty may
 * be null for an older bank question an admin added without setting one. */
public record MockInterviewSessionQuestion(String text, List<String> skills, QuestionDifficulty difficulty) {}
