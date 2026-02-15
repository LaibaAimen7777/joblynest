import React from "react";
import { useParams } from "react-router-dom";
import PosterLayout from "./PosterLayout";
import SeekerDetailCommon from "../components/SeekerDetailCommon";

const ExploreSeekerDetail = () => {
  const { seeker_id } = useParams();

  return (
    <PosterLayout>
      <SeekerDetailCommon seeker_id={seeker_id} mode="explore" />
    </PosterLayout>
  );
};

export default ExploreSeekerDetail;
