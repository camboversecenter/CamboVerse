import { HEAD_LEARNING } from '../headLearning';

export function HeadLearnMore({ id }: { id: string }) {
  const content = HEAD_LEARNING[id];
  if (!content) return null;
  return <details className="bio-learn-more" key={id}>
    <summary>Learn more</summary>
    <h4>Location</h4><p>{content.location}</p>
    <h4>Function</h4><p>{content.function}</p>
    <h4>Main subparts</h4><ul>{content.subparts.map(text => <li key={text}>{text}</li>)}</ul>
    <h4>Model limitations</h4><p>{content.limitations}</p>
    <p>Illustrative teaching model. Not medically validated or intended for diagnosis.</p>
    <small>English learning content. Khmer terminology requires native-speaker review.</small>
  </details>;
}
