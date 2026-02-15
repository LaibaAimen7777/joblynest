import React from "react";
import { useParams } from "react-router-dom";
import PosterLayout from "./PosterLayout";
import SeekerDetailCommon from "../components/SeekerDetailCommon";

const SeekerDetail = () => {
  const { seeker_id, task_id } = useParams();

  return (
    <PosterLayout>
      <SeekerDetailCommon 
        seeker_id={seeker_id} 
        task_id={task_id} 
        mode="recommendation" 
      />
    </PosterLayout>
  );
};

export default SeekerDetail;
