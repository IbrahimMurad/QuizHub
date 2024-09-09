import React, { useState, useEffect } from 'react';
import { fetchClassroomDetails, fetchClassrooms, sendEnrollmentRequest } from '../services/classroomService';
import ClassroomCard from './ClassroomCard';
import ClassroomView from './ClassroomView';
import { useGeneralMsgUpdate } from '../context/GenralMsgContext';
import { useLoadingUpdate } from '../context/LoadingContext';

const DiscoverSection = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [totalClassrooms, setTotalClassrooms] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLoading, setpageLoading] = useState(false);
  const classroomsPerPage = 10; // Number of classrooms per page
  const [selectedClassroomId, setSelectedClassroomId] = useState(null);
  const [classroomDetails, setClassroomDetails] = useState(null);
  const [showEnrollmentPrompt, setShowEnrollmentPrompt] = useState(false);
  const [prompetClassroomId, setPrompetClassroomId] = useState(null);
  
  const toggleLoading = useLoadingUpdate();
  const updateGeneralMsg = useGeneralMsgUpdate();

  useEffect(() => {
    const loadClassrooms = async () => {
        setpageLoading(true);
      try {
        const { classrooms: fetchedClassrooms, totalClassrooms: total } = await fetchClassrooms(classroomsPerPage, (currentPage - 1) * classroomsPerPage);
        setClassrooms(fetchedClassrooms);
        setTotalClassrooms(total);
      } catch (error) {
        console.error('Error fetching classrooms:', error);
      } finally {
        setpageLoading(false);
      }
    };

    loadClassrooms();
  }, [currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= Math.ceil(totalClassrooms / classroomsPerPage)) {
      setCurrentPage(newPage);
    }
  };

  const handleClassroomClick = async (classroomId) => {
    setSelectedClassroomId(classroomId);

    toggleLoading(true);
    try {
      const details = await fetchClassroomDetails(classroomId);
      setClassroomDetails(details);
    } catch (err) {
      if (err === 'Not authorized to view this classroom'){
        setPrompetClassroomId(classroomId);
        setShowEnrollmentPrompt(true);
      } else {
        updateGeneralMsg('Failed to fetch classroom details', 'error');
      }
      handleCloseClassroomView();
    } finally {
      toggleLoading(false);
    }
  };

  const handleCloseClassroomView = () => {
    setSelectedClassroomId(null);
    setClassroomDetails(null);
  };

  const handleSendEnrollmentRequest = async () => {
    try {
      await sendEnrollmentRequest(prompetClassroomId);
      updateGeneralMsg('Enrollment request sent successfully', 'success');
      setShowEnrollmentPrompt(false); // Hide prompt after successful request
    } catch (error) {
      if (error === 'Enrollment request already sent') {
        updateGeneralMsg('You already sent an enrollment request', 'error');
      } else {
        updateGeneralMsg('Failed to send enrollment request', 'error');
      }
    } finally {
      setPrompetClassroomId(null);
      setShowEnrollmentPrompt(false); 
    }
  };

  return (
    <>
    {classroomDetails && (
        <ClassroomView
          classroomId={selectedClassroomId}
          onClose={handleCloseClassroomView}
          details={classroomDetails}
        />
    )}
    {showEnrollmentPrompt && (
        <div className="enrollment-prompt">
          <p>You are not authorized to view this classroom. Would you like to send an enrollment request?</p>
          <button onClick={handleSendEnrollmentRequest}>Send Request</button>
          <button onClick={() => setShowEnrollmentPrompt(false)}>Cancel</button>
        </div>
      )}
    <div className={`discover-section ${classroomDetails ? 'classroomviewed' : ''}`}>
      <h2>Discover Classrooms</h2>
      {pageLoading && <p>Loading...</p>}
      {!pageLoading && classrooms.length === 0 && <p>No classrooms available.</p>}
      <div className="pagination-controls">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          Previous
        </button>
        <span>Page {currentPage} of {Math.ceil(totalClassrooms / classroomsPerPage)}</span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === Math.ceil(totalClassrooms / classroomsPerPage)}
        >
          Next
        </button>
      </div>
      <div className="classroom-list">
        {classrooms.map((classroom) => (
          <ClassroomCard
            key={classroom._id}
            classroom={classroom}
            onClick={handleClassroomClick}
          />
        ))}
      </div>
    </div>
    </>
  );
};

export default DiscoverSection;