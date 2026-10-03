import { Fragment } from 'react';

// "Ana, Ben, Chi +12 more". <bdi> keeps the commas in place around right-to-left names.
export function NameList({ names, limit = 8 }: { names: string[]; limit?: number }) {
  return (
    <>
      {names.slice(0, limit).map((name, i) => (
        <Fragment key={name}>
          {i > 0 && ', '}
          <bdi>{name}</bdi>
        </Fragment>
      ))}
      {names.length > limit && ` +${names.length - limit} more`}
    </>
  );
}
