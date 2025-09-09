import React, { useState, useEffect } from 'react';
import { NamePickerData } from '../types';
import { getNamePickerData, setNamePickerData } from '../services/api';
import { motion } from 'framer-motion';
import { Settings, Users, Ban, Play, X } from 'lucide-react';

interface AdminPanelProps {
  onClose: () => void;
}

interface ParticipantConfig {
  name: string;
  forbiddenNames: string[];
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [data, setData] = useState<NamePickerData | null>(null);
  const [participants, setParticipants] = useState<ParticipantConfig[]>([]);
  const [newParticipant, setNewParticipant] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentData = await getNamePickerData();
      setData(currentData);
      setIsStarted(
        currentData.step !== 'setup' && currentData.step !== undefined
      );

      const participantConfigs = Object.keys(currentData.names).map((name) => ({
        name,
        forbiddenNames: currentData.forbidden?.[name] || []
      }));
      setParticipants(participantConfigs);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = () => {
    if (
      newParticipant.trim() &&
      !participants.find((p) => p.name === newParticipant.trim())
    ) {
      setParticipants([
        ...participants,
        { name: newParticipant.trim(), forbiddenNames: [] }
      ]);
      setNewParticipant('');
    }
  };

  const removeParticipant = (name: string) => {
    setParticipants(participants.filter((p) => p.name !== name));
  };

  const addForbiddenName = (participantName: string, forbiddenName: string) => {
    if (!forbiddenName.trim()) return;

    // Check if the forbidden name is already in the list
    const participant = participants.find((p) => p.name === participantName);
    if (participant?.forbiddenNames.includes(forbiddenName.trim())) {
      return; // Don't add duplicate
    }

    setParticipants(
      participants.map((p) =>
        p.name === participantName
          ? {
              ...p,
              forbiddenNames: [...p.forbiddenNames, forbiddenName.trim()]
            }
          : p
      )
    );
  };

  const removeForbiddenName = (
    participantName: string,
    forbiddenName: string
  ) => {
    setParticipants(
      participants.map((p) =>
        p.name === participantName
          ? {
              ...p,
              forbiddenNames: p.forbiddenNames.filter(
                (name) => name !== forbiddenName
              )
            }
          : p
      )
    );
  };

  const startVoting = async () => {
    if (participants.length < 2) {
      alert('Need at least 2 participants to start voting');
      return;
    }

    // For each participant, create a list of all other participants they can choose from,
    // excluding themselves and any forbidden names
    const names = participants.reduce((acc, p) => {
      const availableNames = participants
        .map((participant) => participant.name)
        .filter((name) => name !== p.name && !p.forbiddenNames.includes(name));
      acc[p.name] = availableNames;
      return acc;
    }, {} as Record<string, string[]>);

    const forbidden = participants.reduce((acc, p) => {
      if (p.forbiddenNames.length > 0) {
        acc[p.name] = p.forbiddenNames;
      }
      return acc;
    }, {} as Record<string, string[]>);

    const newData: NamePickerData = {
      step: 'selection',
      names,
      taken: {},
      forbidden,
      wishes: participants.reduce((acc, p) => {
        acc[p.name] = [];
        return acc;
      }, {} as Record<string, any[]>)
    };

    try {
      console.log('Starting voting with data:', newData);
      await setNamePickerData(newData);
      setIsStarted(true);
      alert(
        `Voting started successfully! Each participant can choose from their available names.`
      );
    } catch (error) {
      console.error('Failed to start voting:', error);
      alert('Failed to start voting');
    }
  };

  const resetSystem = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset the system? This will clear all votes and selections but keep participants and forbidden names.'
      )
    ) {
      return;
    }

    // Preserve current participants and forbidden names
    const names = participants.reduce((acc, p) => {
      const availableNames = participants
        .map((participant) => participant.name)
        .filter((name) => name !== p.name && !p.forbiddenNames.includes(name));
      acc[p.name] = availableNames;
      return acc;
    }, {} as Record<string, string[]>);

    const forbidden = participants.reduce((acc, p) => {
      if (p.forbiddenNames.length > 0) {
        acc[p.name] = p.forbiddenNames;
      }
      return acc;
    }, {} as Record<string, string[]>);

    const resetData: NamePickerData = {
      step: 'setup',
      names,
      taken: {},
      forbidden,
      wishes: participants.reduce((acc, p) => {
        acc[p.name] = [];
        return acc;
      }, {} as Record<string, any[]>)
    };

    try {
      await setNamePickerData(resetData);
      setIsStarted(false);
      alert(
        'System reset successfully! Participants and forbidden names preserved.'
      );
    } catch (error) {
      console.error('Failed to reset system:', error);
      alert('Failed to reset system');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Status */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">System Status</h3>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isStarted ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                {isStarted ? 'Voting is active' : 'Setup mode'}
              </span>
            </div>
            {data && (
              <p className="text-sm text-gray-500 mt-1">
                Current step: {data.step}
              </p>
            )}
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Participants
              </h3>
            </div>

            {!isStarted && (
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  placeholder="Add participant name"
                  className="flex-1 px-3 py-2 border rounded-lg"
                  onKeyDown={(e) => e.key === 'Enter' && addParticipant()}
                />
                <button
                  onClick={addParticipant}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Add
                </button>
              </div>
            )}

            <div className="space-y-4">
              {participants.map((participant) => (
                <motion.div
                  key={participant.name}
                  layout
                  className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      {participant.name}
                    </h4>
                    {!isStarted && (
                      <button
                        onClick={() => removeParticipant(participant.name)}
                        className="text-red-600 hover:text-red-700 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-700">
                        Forbidden Names
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-2">
                      {participant.forbiddenNames.map((forbiddenName) => (
                        <span
                          key={forbiddenName}
                          className="inline-flex items-center gap-1 bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
                          {forbiddenName}
                          {!isStarted && (
                            <button
                              onClick={() =>
                                removeForbiddenName(
                                  participant.name,
                                  forbiddenName
                                )
                              }
                              className="hover:text-red-900">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>

                    {!isStarted && (
                      <>
                        {participants.filter(
                          (p) =>
                            p.name !== participant.name &&
                            !participant.forbiddenNames.includes(p.name)
                        ).length > 0 ? (
                          <select
                            className="w-full px-2 py-1 text-sm border rounded"
                            onChange={(e) => {
                              if (e.target.value) {
                                addForbiddenName(
                                  participant.name,
                                  e.target.value
                                );
                                e.target.value = '';
                              }
                            }}
                            defaultValue="">
                            <option value="" disabled>
                              Select a name to forbid
                            </option>
                            {participants
                              .filter(
                                (p) =>
                                  p.name !== participant.name &&
                                  !participant.forbiddenNames.includes(p.name)
                              )
                              .map((p) => (
                                <option key={p.name} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                          </select>
                        ) : (
                          <p className="text-xs text-gray-500 italic">
                            No more names available to forbid
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            {!isStarted ? (
              <button
                onClick={startVoting}
                disabled={participants.length < 2}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Play className="w-5 h-5" />
                Start Voting
              </button>
            ) : (
              <div className="text-green-600 font-medium flex items-center gap-2">
                <Play className="w-5 h-5" />
                Voting is active
              </div>
            )}

            <button
              onClick={resetSystem}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700">
              <X className="w-5 h-5" />
              Reset System
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
