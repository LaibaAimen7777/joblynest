import React from "react";
import PosterLayout from "./PosterLayout";
import TaskForm from "../components/TaskForm";

const CreateTaskForm = () => {
  return (
    <PosterLayout>
      <TaskForm mode="create" />
    </PosterLayout>
  );
};

export default CreateTaskForm;