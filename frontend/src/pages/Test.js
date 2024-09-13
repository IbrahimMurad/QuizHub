import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchTestDetails } from '../services/testService';
import { useAuth } from '../context/AuthContext';
import { IoIosArrowBack } from 'react-icons/io';
import { useGeneralMsgUpdate } from '../context/GenralMsgContext';
import ScorePrompt from '../components/ScorePrompt';
import { createSubmission, deleteSubmission } from '../services/submissionService';  // Import deleteSubmission
import { useLoadingUpdate } from '../context/LoadingContext';

const Test = () => {
  const { classroomId, testId } = useParams();
  const { user } = useAuth();
  const [test, setTest] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [correctAnswersCount, setCorrectAnswersCount] = useState(0);
  const [showScorePrompt, setShowScorePrompt] = useState(false);
  const [showSubmissionPrompt, setShowSubmissionPrompt] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const navigate = useNavigate();
  const generalMsgUpdate = useGeneralMsgUpdate();
  const setLoading = useLoadingUpdate();

  useEffect(() => {
    const getTestDetails = async () => {
      try {
        setLoading(true);
        const testData = await fetchTestDetails(classroomId, testId);
        setTest(testData);
        setSubmissions(testData.submissions || []);

        // Use the first submission if available
        if (testData.submissions.length > 0 && user._id !== testData.classroomId.owner) {
          const firstSubmission = testData.submissions[0];
          setAnswers(firstSubmission.answers.reduce((acc, { questionId, answer }) => {
            acc[questionId] = answer;
            return acc;
          }, {}));
          setSubmitted(true);
          setSelectedSubmission(firstSubmission);
          setSelectedUserName(`${firstSubmission.userId.firstName} ${firstSubmission.userId.lastName}`);
          generalMsgUpdate('You have already submitted this test. Only one submission is allowed.', 'info');
        }
      } catch (error) {
        generalMsgUpdate('Failed to fetch test details', 'error');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    getTestDetails();
  }, [classroomId, testId]);

  const handleDeleteSubmission = async (submissionId) => {
    try {
      await deleteSubmission(testId, submissionId);
      setSubmissions(submissions.filter(submission => submission._id !== submissionId));
      generalMsgUpdate('Submission deleted successfully', 'success');
    } catch (error) {
      generalMsgUpdate('Failed to delete submission', 'error');
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prevAnswers => ({
      ...prevAnswers,
      [questionId]: answer
    }));
  };

  const handleSubmit = async () => {
    setSubmissionLoading(true);
    if (test) {
      let count = 0;

      test.questions.forEach(question => {
        const selectedAnswerIndex = question.options.indexOf(answers[question._id]);
        if (selectedAnswerIndex === Number(question.correctAnswer)) {
          count += 1;
        }
      });

      setCorrectAnswersCount(count);

      try {
        const submissionData = {
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer
          })),
          score: count
        };

        await createSubmission(testId, submissionData);

        generalMsgUpdate('Submitted answers successfully', 'success');
        setSubmitted(true);
        setShowScorePrompt(true); // Show score prompt after submission
      } catch (error) {
        generalMsgUpdate('Failed to submit answers', 'error');
      } finally {
        setSubmissionLoading(false);
      }
    }
  };

  const handleViewTest = () => {
    setShowScorePrompt(false); // Remove the prompt
  };

  const handleGoBackToClassroom = () => {
    navigate(-1); // Navigate back to the classroom
  };

  const handleShowSubmissionsPrompt = () => {
    setShowSubmissionPrompt(true);
  };

  const handleCloseSubmissionsPrompt = () => {
    setShowSubmissionPrompt(false);
  };

  const handleSelectSubmission = (submission) => {
    setSelectedSubmission(submission);
    setSelectedUserName(`${submission.userId.firstName} ${submission.userId.lastName}`);
    const answersMap = submission.answers.reduce((acc, { questionId, answer }) => {
      acc[questionId] = answer;
      return acc;
    }, {});
    setAnswers(answersMap);
    setShowSubmissionPrompt(false);
  };

  const handleClearSelectedSubmission = () => {
    setSelectedSubmission(null);
    setSelectedUserName('');
    setAnswers({});
  };

  const isOwner = user._id === test?.classroomId.owner; // Check if user is the owner

  const allQuestionsAnswered = test ? test.questions.every(question => answers[question._id]) : false;

  if (!test) {
    return <p>Loading test details...</p>;
  }

  return (
    <div className="test-page">
      <div className='top-options'>
        <button className="close-button" onClick={handleGoBackToClassroom}><IoIosArrowBack /></button>
        {isOwner && (
          <div className="submission-container">
            <button className="btn btn-info" onClick={handleShowSubmissionsPrompt}>
              Submissions ({submissions.length})
            </button>
          </div>
        )}
      </div>
      
      <div className='test-info-container'>
        <h1>{test.title}</h1>
        {selectedUserName && isOwner && (
          <div className="submission-info">
            <button className="clear-button btn-remove" onClick={handleClearSelectedSubmission}>&#x2715;</button>
            <h3>Submitted by: {selectedUserName}</h3>
          </div>
        )}
        {test.description && (
          <div className='test-info'>
            <h2>Description:</h2>
            <p>{test.description}</p>
          </div>
        )}
        {test.requirements && (
          <div className='test-info'>
            <h2>Requirements:</h2>
            <p>{test.requirements}</p>
          </div>
        )}
      </div>

      <div className="questions">
        <ol>
          {test.questions.map((question, index) => (
            <li key={question._id} className={`question-container ${submitted ? 'submitted' : ''}`}>
              <p className="question">Question {index + 1}: {question.questionText}</p>
              <div className="options">
                {question.options.map((option, optionIndex) => {
                  const isCorrect = optionIndex === Number(question.correctAnswer);
                  const isSelected = option === answers[question._id];
                  const isWrong = isSelected && !isCorrect;

                  return (
                    <label 
                      key={optionIndex} 
                      className={
                        (isOwner || submitted) ? 
                          (isCorrect ? 'correct' : isWrong ? 'wrong' : '') 
                          : ''
                      }
                    >
                      <input
                        type="radio"
                        name={question._id}
                        value={option}
                        checked={isSelected}
                        onChange={() => handleAnswerChange(question._id, option)}
                        disabled={submitted || isOwner} // Disable inputs if submitted or if user is owner
                      />
                      {option}
                    </label>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {!submitted && !isOwner && (
        <div className="submit-button-container">
          <button
            className='btn btn-success'
            onClick={handleSubmit}
            disabled={!allQuestionsAnswered}
          >
            {submissionLoading ? 'Submitting...' : 'Submit'}
          </button>
          {!allQuestionsAnswered && (
            <span className="tooltip">Please answer all questions before submitting.</span>
          )}
        </div>
      )}

      {/* Submission Prompt */}
      {showSubmissionPrompt && (
        <div className='prompt-container'>
          <div className='prompt-background' onClick={handleCloseSubmissionsPrompt}></div>
          <div className="submission-prompt prompt">
            <button className="close-button close-button-submission" onClick={handleCloseSubmissionsPrompt}><IoIosArrowBack /></button>
            <h2>Submissions</h2>
            <ul>
              {submissions.map((submission, index) => (
                <li key={submission._id}>
                  {index + 1}.
                  <span className='name'>{submission.userId.firstName} {submission.userId.lastName}</span>
                  <div className='btns'>
                    <button className='btn-show' onClick={() => handleSelectSubmission(submission)}>Show</button>
                    <button className='btn-remove' onClick={() => handleDeleteSubmission(submission._id)}>Delete</button> {/* Delete button */}
                  </div>
                  <span className='submission-score'>{submission.score} / {test.maxScore}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Score Prompt */}
      {showScorePrompt && (
        <ScorePrompt
          correctAnswersCount={correctAnswersCount}
          test={test}
          onClose={handleViewTest}
          handleGoBackToClassroom={handleGoBackToClassroom}
        />
      )}
    </div>
  );
};

export default Test;