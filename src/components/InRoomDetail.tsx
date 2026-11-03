import {specimenById} from '../lab';
import type {Detail} from './LabOrgans';
import {SpecimenView} from './SpecimenView';
import './InRoomDetail.css';

/** Detail and standalone lessons share the same native XR entry and controls. */
export function InRoomDetail({specimenId, detail, onClose, onOpenSpecimen}: {
  specimenId: string; detail: Detail; onClose: () => void; onOpenSpecimen: (id: string) => void;
}) {
  const specimen = specimenById(specimenId);
  if (!specimen) return null;
  return <div className="bio-detail-overlay bio-ui" onClick={e => e.stopPropagation()}>
    <SpecimenView specimen={specimen} initialDetail={detail} onBack={onClose}
      backLabel="← Back to room" onOpenSpecimen={onOpenSpecimen}/>
  </div>;
}
