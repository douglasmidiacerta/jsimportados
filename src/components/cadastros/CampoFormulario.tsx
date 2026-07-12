import type { HTMLInputTypeAttribute } from "react";

type Opcao = { valor: string; rotulo: string };

type Props = {
  label: string;
  name: string;
  as?: "input" | "textarea" | "select";
  type?: HTMLInputTypeAttribute;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "tel"
    | "email"
    | "search"
    | "url";
  autoComplete?: string;
  opcoes?: Opcao[];
  opcaoVazia?: string;
  dica?: string;
  prefixo?: string;
};

const CLASSE_BASE =
  "w-full min-h-[52px] rounded-xl border border-line bg-surface-2 px-4 text-base text-ink placeholder:text-muted outline-none focus:border-accent focus:bg-surface transition-colors";

/** Campo de formulário reutilizável (input, textarea ou select) no design system. */
export function CampoFormulario({
  label,
  name,
  as = "input",
  type = "text",
  defaultValue,
  placeholder,
  required = false,
  inputMode,
  autoComplete,
  opcoes,
  opcaoVazia,
  dica,
  prefixo,
}: Props) {
  const valor = defaultValue ?? undefined;

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-danger"> *</span>}
      </span>

      {as === "textarea" ? (
        <textarea
          name={name}
          defaultValue={valor}
          placeholder={placeholder}
          required={required}
          rows={3}
          className={`${CLASSE_BASE} py-3 resize-y`}
        />
      ) : as === "select" ? (
        <select
          name={name}
          defaultValue={valor}
          required={required}
          className={`${CLASSE_BASE} appearance-none`}
        >
          {opcaoVazia !== undefined && <option value="">{opcaoVazia}</option>}
          {opcoes?.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <span className="relative flex items-center">
          {prefixo && (
            <span className="absolute left-4 text-muted text-base pointer-events-none">
              {prefixo}
            </span>
          )}
          <input
            name={name}
            type={type}
            defaultValue={valor}
            placeholder={placeholder}
            required={required}
            inputMode={inputMode}
            autoComplete={autoComplete}
            className={`${CLASSE_BASE} ${prefixo ? "pl-10" : ""}`}
          />
        </span>
      )}

      {dica && <span className="text-xs text-muted">{dica}</span>}
    </label>
  );
}
