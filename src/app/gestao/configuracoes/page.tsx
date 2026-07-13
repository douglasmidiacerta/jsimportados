import { exigirGestao } from "@/lib/perfil";
import { obterEmpresa } from "@/lib/dados/empresa";
import { BarraTopo } from "@/components/BarraTopo";
import { CabecalhoCadastro } from "@/components/cadastros/CabecalhoCadastro";
import { CampoFormulario } from "@/components/cadastros/CampoFormulario";
import { salvarEmpresaAction } from "./actions";

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const perfil = await exigirGestao();
  const { ok, erro } = await searchParams;
  const e = await obterEmpresa();

  return (
    <>
      <BarraTopo nome={perfil.nome} papel={perfil.papel} area="gestao" />
      <main className="mx-auto max-w-2xl w-full px-4 py-6 sm:py-10 flex-1">
        <CabecalhoCadastro
          titulo="Configurações da empresa"
          descricao="Os dados usados no cabeçalho do sistema e nas impressões (recibos)."
          voltarHref="/gestao"
        />

        {ok && (
          <p className="mb-4 text-sm text-good font-medium bg-[var(--good)]/10 border border-[var(--good)]/30 rounded-lg px-3 py-2">
            Configurações salvas.
          </p>
        )}
        {erro && (
          <p className="mb-4 text-sm text-danger font-medium bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-lg px-3 py-2">
            Não deu para salvar. Confira os campos (UF com 2 letras) e tente de novo.
          </p>
        )}

        <form action={salvarEmpresaAction} className="flex flex-col gap-5">
          <CampoFormulario label="Nome da empresa" name="nome" defaultValue={e.nome} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CampoFormulario label="CNPJ (opcional)" name="cnpj" inputMode="numeric" defaultValue={e.cnpj ?? ""} placeholder="Só números" />
            <CampoFormulario label="Telefone" name="telefone" type="tel" inputMode="tel" defaultValue={e.telefone ?? ""} />
          </div>
          <CampoFormulario label="E-mail" name="email" type="email" inputMode="email" defaultValue={e.email ?? ""} />

          <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
            <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">Endereço</legend>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CampoFormulario label="CEP" name="cep" inputMode="numeric" defaultValue={e.cep ?? ""} placeholder="00000-000" />
              <div className="sm:col-span-2">
                <CampoFormulario label="Logradouro" name="logradouro" defaultValue={e.logradouro ?? ""} placeholder="Rua, avenida…" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <CampoFormulario label="Número" name="numero" defaultValue={e.numero ?? ""} />
              <CampoFormulario label="Complemento" name="complemento" defaultValue={e.complemento ?? ""} />
              <CampoFormulario label="Bairro" name="bairro" defaultValue={e.bairro ?? ""} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <CampoFormulario label="Cidade" name="cidade" defaultValue={e.cidade ?? ""} />
              </div>
              <CampoFormulario label="UF" name="uf" defaultValue={e.uf ?? ""} placeholder="SP" />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
            <legend className="px-2 text-sm font-bold text-ink uppercase tracking-wide">Impressões</legend>
            <CampoFormulario
              label="Mensagem de rodapé"
              name="mensagem_rodape"
              as="textarea"
              defaultValue={e.mensagem_rodape ?? ""}
              placeholder="Ex.: Obrigado pela preferência! Trocas em até 7 dias com a nota."
              dica="Aparece no fim dos recibos impressos (Leva F)."
            />
            <CampoFormulario
              label="Vias padrão ao imprimir"
              name="vias"
              as="select"
              defaultValue={String(e.vias)}
              opcoes={[
                { valor: "1", rotulo: "1 via" },
                { valor: "2", rotulo: "2 vias" },
                { valor: "3", rotulo: "3 vias" },
                { valor: "4", rotulo: "4 vias" },
              ]}
            />
          </fieldset>

          <div className="flex justify-end">
            <button type="submit" className="h-12 rounded-xl bg-accent text-white px-6 font-bold shadow-[var(--shadow)] active:scale-[0.99]">
              Salvar configurações
            </button>
          </div>
        </form>

        <p className="text-xs text-muted mt-4">
          O logotipo para as impressões entra junto com a Leva F (recibos e cupons).
        </p>
      </main>
    </>
  );
}
