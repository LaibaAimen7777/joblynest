import React from "react";
import { useLocation } from "react-router-dom";
import PosterLayout from "./PosterLayout";
import TaskForm from "../components/TaskForm";

const ExploreCreateTask = () => {
  const location = useLocation();
  const { seeker, selectedSlots, earliestDate, payRate } = location.state || {};

  return (
    <PosterLayout>
      <TaskForm 
        mode="explore"
        preselectedSeeker={seeker}
        preselectedSlots={selectedSlots}
        preselectedPayRate={payRate}
      />
    </PosterLayout>
  );
};

export default ExploreCreateTask;