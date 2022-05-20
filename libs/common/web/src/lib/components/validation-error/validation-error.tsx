import { ErrorBase } from '../../utils/validation';

export interface ValidationErrorProps {
  error?: ErrorBase;
}

export function ValidationError({error}: ValidationErrorProps) {
  if (!error) {
    return null;
  }

  return (
    <span className="root">
      {error.message}

      <style jsx>{`
        .root {
          color: pink;
          margin: .5em;
        }
      `}</style>
    </span>
  );
}

export default ValidationError;
