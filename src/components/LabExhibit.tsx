import { useLayoutEffect, useRef, useState } from "react";
import { Box3, type Group } from "three";
import { Heart, Lungs, type Detail } from "./LabOrgans";
import { Body, SingleOrgan } from "./LabBody";
import { Eye } from "./LabEye";
import { Lever, GearTrain, Engine } from "./LabMachines";
import { Water, Methane, SaltCrystal, Carbon } from "./LabChemistry";
import { BurnMethane, MakeWater, Neutralise } from "./LabReactions";
import { TreadlePump, BiogasDigester } from "./LabFarm";
import { Seasons } from "./LabEarth";
import { LabStage } from "./LabStage";
import { LabHeartPilot } from "./LabHeartPilot";
import { LabBodyPilot } from "./LabBodyPilot";
import { LabSkeletonPilot } from "./LabSkeletonPilot";
import { LabBoneStudy } from './LabBoneStudy';
import { ReviewedOrganDetail } from "./ReviewedOrgan";
import { specimenById } from "../lab";
import { LabEyePilot } from "./LabEyePilot";
import { LabLungsPilot } from "./LabLungsPilot";
import { HeadAnatomyFallback, LabHeadAnatomyPilot } from "./LabHeadAnatomyPilot";
import type { LabLayer, Specimen } from "../lab";

export type ExhibitProps = {
  id: string; organOf?: string; layer: LabLayer; detail: Detail;
  onPick: (partId: string) => void; selected: string | null; extracted: string | null;
  running: boolean; knob: number;
};

/** Shared by the interactive viewer and the offline thumbnail renderer. */
export function TheSpecimen(props: ExhibitProps) {
  const { id, organOf, layer, detail, onPick, selected, extracted } = props;
  if (organOf) {
    const fallback = <SingleOrgan organId={organOf} detail={detail} onPick={onPick} selected={selected} />;
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return fallback;
    if (organOf === 'skeleton') return <LabSkeletonPilot detail={detail} onPick={onPick} fallback={fallback} />;
    const specimen = specimenById(id);
    return <ReviewedOrganDetail id={organOf} detail={detail} diameter={Math.max(specimen?.sizeU ?? 20, specimen?.spanU ?? 20)} selected={selected === organOf} onPick={onPick} fallback={fallback} />;
  }
  switch (id) {
    case 'humerus-study': return <LabBoneStudy detail={detail} mode="macro" />;
    case 'bone-cutaway-study': return <LabBoneStudy detail={detail} mode="cutaway" />;
    case 'osteon-study': return <LabBoneStudy detail={detail} mode="micro" />;
    case "lever": return <Lever {...props} />;
    case "gear-train": return <GearTrain {...props} />;
    case "engine": return <Engine {...props} />;
    case "water": return <Water {...props} />;
    case "methane": return <Methane {...props} />;
    case "salt": return <SaltCrystal {...props} />;
    case "carbon": return <Carbon {...props} />;
    case "burn-methane": return <BurnMethane {...props} />;
    case "make-water": return <MakeWater {...props} />;
    case "neutralise": return <Neutralise {...props} />;
    case "treadle-pump": return <TreadlePump {...props} />;
    case "biogas": return <BiogasDigester {...props} />;
    case "seasons": return <Seasons {...props} />;
    case "eye": {
      const procedural = <Eye {...props} />;
      return import.meta.env.DEV && import.meta.env.MODE !== "test"
        ? <LabEyePilot {...props} fallback={procedural} /> : procedural;
    }
    case "head-anatomy": {
      const procedural = <HeadAnatomyFallback layer={layer} onPick={onPick} />;
      return import.meta.env.DEV && import.meta.env.MODE !== "test"
        ? <LabHeadAnatomyPilot {...props} fallback={procedural} /> : procedural;
    }
    case "human-body": {
      const procedural = <Body layer={layer} detail={detail} onPick={onPick} selected={selected} extracted={extracted} />;
      if (import.meta.env.DEV && import.meta.env.MODE !== 'test' && layer === 'frame') return <LabSkeletonPilot detail={detail} onPick={onPick} fallback={procedural} />;
      return import.meta.env.DEV && import.meta.env.MODE !== "test" && layer === "whole"
        ? <LabBodyPilot detail={detail} onPick={onPick} selected={selected} fallback={procedural} />
        : procedural;
    }
    case "heart": {
      const procedural = <Heart layer={layer} detail={detail} onPick={onPick} selected={selected} />;
      // Local Blender assets are git-ignored. Never request them in a deployed
      // build, and retain procedural cutaways while the pilot is assembled-only.
      return import.meta.env.DEV && import.meta.env.MODE !== "test" && layer === "whole"
        ? <LabHeartPilot detail={detail} onPick={onPick} fallback={procedural} />
        : procedural;
    }
    case "lungs": {
      const procedural = <Lungs layer={layer} detail={detail} onPick={onPick} selected={selected} />;
      return import.meta.env.DEV && import.meta.env.MODE !== "test"
        ? <LabLungsPilot {...props} fallback={procedural} /> : procedural;
    }
    default: return null;
  }
}

/** Measure the whole exhibit once; peeling layers or moving parts must not move the bench. */
export function StagedExhibit({ specimen, ...props }: ExhibitProps & { specimen: Specimen }) {
  const model = useRef<Group>(null);
  const [floor, setFloor] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!model.current) return;
    const bounds = new Box3().setFromObject(model.current, true);
    if (!bounds.isEmpty()) setFloor(bounds.min.y);
  }, []);

  return <>
    {floor !== null && <LabStage size={specimen.sizeU} span={specimen.spanU}
      centre={specimen.centreU ?? specimen.sizeU * 0.15} floor={floor} detail={props.detail} />}
    <group ref={model} name="lab-specimen"><TheSpecimen {...props} /></group>
  </>;
}
