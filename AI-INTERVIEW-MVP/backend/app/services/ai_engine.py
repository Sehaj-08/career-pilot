from app.schemas.interview import AnswerSubmission, EvaluationResponse

def evaluate_candidate_answer(submission: AnswerSubmission) -> EvaluationResponse:
    answer_length = len(submission.answer.strip())
    score = 75 if answer_length > 30 else 50
    feedback = "Good understanding shown. Consider detailing real-world edge cases."

    return EvaluationResponse(
        question_id=submission.question_id,
        score=score,
        feedback=feedback
    )
