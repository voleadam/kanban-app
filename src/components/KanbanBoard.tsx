import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, X, Edit2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

interface Card {
  id: string;
  project_id: string;
  column_type: 'todo' | 'inprogress' | 'done';
  content: string;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface KanbanBoardProps {
  projectId: string;
}

const COLUMNS = {
  todo: { id: 'todo', title: 'To Do', color: 'bg-red-100 border-red-200' },
  inprogress: { id: 'inprogress', title: 'In Progress', color: 'bg-yellow-100 border-yellow-200' },
  done: { id: 'done', title: 'Done', color: 'bg-green-100 border-green-200' },
} as const;

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ projectId }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardContent, setNewCardContent] = useState({ todo: '', inprogress: '', done: '' });
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    loadCards();
    
    // Set up real-time subscription
    const subscription = supabase
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cards',
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCards((current) => [...current, payload.new as Card]);
          } else if (payload.eventType === 'UPDATE') {
            setCards((current) =>
              current.map((card) =>
                card.id === payload.new.id ? (payload.new as Card) : card
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setCards((current) =>
              current.filter((card) => card.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [projectId]);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setCards(data || []);
    } catch (error: any) {
      toast.error('Error loading cards');
    } finally {
      setLoading(false);
    }
  };

  const addCard = async (columnType: 'todo' | 'inprogress' | 'done') => {
    const content = newCardContent[columnType].trim();
    if (!content) return;

    try {
      const columnCards = cards.filter(card => card.column_type === columnType);
      const maxOrderIndex = Math.max(...columnCards.map(card => card.order_index), -1);

      const { error } = await supabase
        .from('cards')
        .insert([
          {
            project_id: projectId,
            column_type: columnType,
            content,
            order_index: maxOrderIndex + 1,
            created_by: user?.id,
          },
        ]);

      if (error) throw error;

      setNewCardContent({ ...newCardContent, [columnType]: '' });
      toast.success('Card added successfully!');
    } catch (error: any) {
      toast.error('Error adding card');
    }
  };

  const updateCard = async (cardId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .update({ content })
        .eq('id', cardId);

      if (error) throw error;

      setEditingCard(null);
      setEditContent('');
      toast.success('Card updated successfully!');
    } catch (error: any) {
      toast.error('Error updating card');
    }
  };

  const deleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;
      toast.success('Card deleted successfully!');
    } catch (error: any) {
      toast.error('Error deleting card');
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = source.droppableId as 'todo' | 'inprogress' | 'done';
    const destColumn = destination.droppableId as 'todo' | 'inprogress' | 'done';

    // Get all cards in the destination column
    const destCards = cards
      .filter(card => card.column_type === destColumn)
      .sort((a, b) => a.order_index - b.order_index);

    // Calculate new order index
    let newOrderIndex: number;
    if (destination.index === 0) {
      newOrderIndex = destCards[0] ? destCards[0].order_index - 1 : 0;
    } else if (destination.index >= destCards.length) {
      newOrderIndex = destCards[destCards.length - 1] ? destCards[destCards.length - 1].order_index + 1 : 0;
    } else {
      const prevCard = destCards[destination.index - 1];
      const nextCard = destCards[destination.index];
      newOrderIndex = (prevCard.order_index + nextCard.order_index) / 2;
    }

    try {
      const { error } = await supabase
        .from('cards')
        .update({
          column_type: destColumn,
          order_index: newOrderIndex,
        })
        .eq('id', draggableId);

      if (error) throw error;
    } catch (error: any) {
      toast.error('Error moving card');
    }
  };

  const getColumnCards = (columnType: 'todo' | 'inprogress' | 'done') => {
    return cards
      .filter(card => card.column_type === columnType)
      .sort((a, b) => a.order_index - b.order_index);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          {Object.values(COLUMNS).map((column) => (
            <div key={column.id} className={`${column.color} rounded-xl p-4 h-fit min-h-[600px]`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{column.title}</h2>
                <span className="bg-white px-2 py-1 rounded-full text-sm font-medium text-gray-600">
                  {getColumnCards(column.id).length}
                </span>
              </div>

              {/* Add new card */}
              <div className="mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newCardContent[column.id]}
                    onChange={(e) =>
                      setNewCardContent({
                        ...newCardContent,
                        [column.id]: e.target.value,
                      })
                    }
                    placeholder="Add a new card..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addCard(column.id);
                      }
                    }}
                  />
                  <button
                    onClick={() => addCard(column.id)}
                    className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              {/* Cards */}
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`space-y-3 min-h-[400px] ${
                      snapshot.isDraggingOver ? 'bg-white bg-opacity-50 rounded-lg' : ''
                    }`}
                  >
                    {getColumnCards(column.id).map((card, index) => (
                      <Draggable key={card.id} draggableId={card.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 transition-all ${
                              snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                            }`}
                          >
                            {editingCard === card.id ? (
                              <div className="space-y-2">
                                <textarea
                                  value={editContent}
                                  onChange={(e) => setEditContent(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                  rows={3}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      updateCard(card.id, editContent);
                                    }
                                  }}
                                />
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => updateCard(card.id, editContent)}
                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                  >
                                    <Save size={14} />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingCard(null);
                                      setEditContent('');
                                    }}
                                    className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="group">
                                <p className="text-gray-900 text-sm mb-3 whitespace-pre-wrap">
                                  {card.content}
                                </p>
                                <div className="flex items-center justify-between">
                                  <div className="text-xs text-gray-500">
                                    {new Date(card.created_at).toLocaleDateString()}
                                  </div>
                                  <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => {
                                        setEditingCard(card.id);
                                        setEditContent(card.content);
                                      }}
                                      className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={() => deleteCard(card.id)}
                                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};