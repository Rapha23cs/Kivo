import React, { useState } from 'react';
import {
  X,
  Plus,
  Copy,
  Edit3,
  Trash2,
  ClipboardList,
  Check,
  Leaf,
  HardHat
} from 'lucide-react';
import { useFeedback } from '../common/FeedbackProvider';
import { WORK_DISCIPLINES, getDisciplineMeta } from '../../data/workflowsConfig';
import { EMSERH_BASE_ITEMS } from '../../data/emserhChecklistData';
import { buildSstChecklist } from '../../data/sstChecklistData';

export default function ChecklistTemplatesModal({
  isOpen,
  templates = [],
  onSaveTemplate,
  onDeleteTemplate,
  onClose
}) {
  const { confirm, toast } = useFeedback();
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const startBlank = (disciplina = 'meio_ambiente') => {
    setEditing({
      id: null,
      nome: '',
      disciplina,
      descricao: '',
      itens: [
        {
          id: `new-${Date.now()}`,
          topic: disciplina === 'seguranca_trabalho' ? 'Condições Gerais de SST' : 'Verificação Geral',
          question: ''
        }
      ]
    });
  };

  const duplicateBaseModel = (disciplina) => {
    const baseItems =
      disciplina === 'seguranca_trabalho'
        ? buildSstChecklist()
        : EMSERH_BASE_ITEMS;
    setEditing({
      id: null,
      nome:
        disciplina === 'seguranca_trabalho'
          ? 'Cópia Padrão SST (NRs)'
          : 'Cópia Padrão Meio Ambiente (63 itens)',
      disciplina,
      descricao: 'Modelo personalizado baseado no checklist padrão Kivo.',
      itens: baseItems.map((it, idx) => ({
        id: `copy-${Date.now()}-${idx}`,
        topic: it.topic || 'Geral',
        nrCode: it.nrCode || '',
        question: it.question || ''
      }))
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSaveTemplate(editing);
      toast.success({
        title: editing.id ? 'Modelo atualizado' : 'Modelo de checklist criado',
        message: editing.nome
      });
      setEditing(null);
    } catch (err) {
      toast.error({ title: 'Não foi possível salvar modelo', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    const lastTopic = editing.itens[editing.itens.length - 1]?.topic || 'Geral';
    setEditing((prev) => ({
      ...prev,
      itens: [
        ...prev.itens,
        {
          id: `item-${Date.now()}-${prev.itens.length + 1}`,
          topic: lastTopic,
          question: ''
        }
      ]
    }));
  };

  const updateItem = (idx, field, val) => {
    setEditing((prev) => ({
      ...prev,
      itens: prev.itens.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
    }));
  };

  const removeItem = (idx) => {
    setEditing((prev) => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#111214] border-0 sm:border sm:border-[#232429] w-full sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1F2024] bg-[#141518] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#122620] text-[#34D399] rounded-lg border border-[#2EB88A]/30">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[#F4F4F5] text-sm sm:text-base">
                Construtor de Modelos de Checklist Personalizados
              </h3>
              <p className="text-[11px] text-[#71717A]">
                Crie ou duplique questionários sob medida por cliente ou contrato (Meio Ambiente &amp; SST)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#71717A] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1C1D22]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 text-xs space-y-5">
          {!editing ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141518] border border-[#232429] rounded-xl p-4">
                <div>
                  <span className="font-semibold text-[#F4F4F5] block">Criar novo modelo de verificação</span>
                  <span className="text-[11px] text-[#71717A]">
                    Comece do zero ou clone os checklists oficiais para adaptar às regras do seu cliente.
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => duplicateBaseModel('meio_ambiente')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-lg text-[#E4E4E7] font-medium"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#34D399]" />
                    Clonar Meio Ambiente (63)
                  </button>
                  <button
                    type="button"
                    onClick={() => duplicateBaseModel('seguranca_trabalho')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-lg text-[#E4E4E7] font-medium"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#FBBF24]" />
                    Clonar SST NRs (37)
                  </button>
                  <button
                    type="button"
                    onClick={() => startBlank('meio_ambiente')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2EB88A] hover:bg-[#34D399] text-[#09090B] rounded-lg font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Criar do Zero
                  </button>
                </div>
              </div>

              {templates.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-[#232429] rounded-xl text-[#71717A]">
                  Nenhum modelo personalizado criado ainda. Use os botões acima para criar ou clonar um modelo.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {templates.map((tpl) => {
                    const disc = getDisciplineMeta(tpl.disciplina);
                    const isSst = tpl.disciplina === 'seguranca_trabalho';
                    return (
                      <div
                        key={tpl.id}
                        className="bg-[#141518] border border-[#232429] rounded-xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
                                isSst
                                  ? 'bg-[#221A10] text-[#FBBF24] border-[#F59E0B]/30'
                                  : 'bg-[#122620] text-[#34D399] border-[#2EB88A]/30'
                              }`}
                            >
                              {isSst ? <HardHat className="w-3 h-3" /> : <Leaf className="w-3 h-3" />}
                              {disc.label}
                            </span>
                            <span className="font-mono text-[11px] text-[#34D399]">
                              {tpl.itens?.length || 0} itens
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-[#F4F4F5]">{tpl.nome}</h4>
                          {tpl.descricao && (
                            <p className="text-[11px] text-[#71717A] line-clamp-2">{tpl.descricao}</p>
                          )}
                        </div>

                        <div className="pt-2.5 border-t border-[#1F2024] flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(JSON.parse(JSON.stringify(tpl)))}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1C1D22] hover:bg-[#25272E] border border-[#2D2F36] rounded-lg text-[#F4F4F5] font-medium"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#34D399]" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await confirm({
                                title: 'Excluir modelo personalizado',
                                message: 'Vistorias já criadas mantêm suas perguntas salvas; apenas este modelo será removido.',
                                detail: tpl.nome,
                                confirmLabel: 'Excluir Modelo',
                                variant: 'danger'
                              });
                              if (ok) {
                                await onDeleteTemplate(tpl.id);
                                toast.success({ title: 'Modelo removido', message: tpl.nome });
                              }
                            }}
                            className="p-1.5 text-[#71717A] hover:text-[#FB7185] hover:bg-[#221216] rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#A1A1AA] font-medium mb-1">Nome do Modelo *</label>
                  <input
                    type="text"
                    required
                    value={editing.nome}
                    onChange={(e) => setEditing({ ...editing, nome: e.target.value })}
                    placeholder="Ex: Checklist SST Clínica Médica (Simplificado)"
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  />
                </div>
                <div>
                  <label className="block text-[#A1A1AA] font-medium mb-1">Fluxo de Trabalho *</label>
                  <select
                    value={editing.disciplina}
                    onChange={(e) => setEditing({ ...editing, disciplina: e.target.value })}
                    className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                  >
                    {WORK_DISCIPLINES.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">Descrição / Escopo</label>
                <input
                  type="text"
                  value={editing.descricao}
                  onChange={(e) => setEditing({ ...editing, descricao: e.target.value })}
                  placeholder="Ex: Aplicável a ambulatórios e unidades de baixa complexidade"
                  className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-3 py-2 text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#F4F4F5]">
                    Itens do Checklist ({editing.itens.length})
                  </span>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#122620] hover:bg-[#17322A] text-[#34D399] border border-[#2EB88A]/40 rounded-lg font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Pergunta
                  </button>
                </div>

                <div className="space-y-2 max-h-[42dvh] overflow-y-auto pr-1">
                  {editing.itens.map((it, idx) => (
                    <div
                      key={it.id || idx}
                      className="bg-[#141518] border border-[#232429] rounded-xl p-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start"
                    >
                      <div className="sm:col-span-4">
                        <input
                          type="text"
                          value={it.topic}
                          onChange={(e) => updateItem(idx, 'topic', e.target.value)}
                          placeholder="Temática / NR"
                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-[11px] text-[#34D399] font-medium focus:outline-none focus:border-[#2EB88A]"
                        />
                      </div>
                      <div className="sm:col-span-7">
                        <input
                          type="text"
                          required
                          value={it.question}
                          onChange={(e) => updateItem(idx, 'question', e.target.value)}
                          placeholder={`Pergunta #${idx + 1}...`}
                          className="w-full bg-[#0D0E10] border border-[#27282E] rounded-lg px-2.5 py-1.5 text-xs text-[#F4F4F5] focus:outline-none focus:border-[#2EB88A]"
                        />
                      </div>
                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          disabled={editing.itens.length <= 1}
                          className="p-1.5 text-[#71717A] hover:text-[#FB7185] disabled:opacity-30 rounded-lg hover:bg-[#221216]"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1F2024] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-[#A1A1AA] hover:text-[#F4F4F5] rounded-lg hover:bg-[#1E2025]"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#2EB88A] hover:bg-[#34D399] disabled:opacity-50 text-[#09090B] font-semibold rounded-lg"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Salvando...' : 'Salvar Modelo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
