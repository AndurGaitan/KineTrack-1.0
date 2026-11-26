import { ComponentProps } from 'react';
import { Button } from './Button';

interface SaveButtonProps extends ComponentProps<typeof Button> {
  saving: boolean;
  /** Recién guardado: confirma en el mismo botón y evita un segundo toque que duplique el registro. */
  saved?: boolean;
}

export function SaveButton({ saving, saved = false, disabled, className = '', children, ...props }: SaveButtonProps) {
  return (
    <Button
      type="submit"
      {...props}
      disabled={disabled || saving || saved}
      aria-busy={saving}
      className={`${className} ${saved ? '!bg-green-700 !opacity-100' : ''}`}
    >
      {saving ? 'Guardando...' : saved ? '✓ Guardado' : children}
    </Button>
  );
}
