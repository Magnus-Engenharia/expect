import { useState } from "react";
import { FeatureFlag, generateFlagId } from "../data.ts";
import { Modal } from "../components/modal.tsx";
import { useToast } from "../components/toast.tsx";

interface FeaturesPageProps {
  featureFlags: FeatureFlag[];
  setFeatureFlags: React.Dispatch<React.SetStateAction<FeatureFlag[]>>;
}

const formatDate = (dateString: string): string =>
  new Date(dateString).toLocaleDateString(undefined, {
    dateStyle: "medium",
  });

export const FeaturesPage = ({ featureFlags, setFeatureFlags }: FeaturesPageProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const { showToast } = useToast();

  const filteredFlags = featureFlags.filter((flag) =>
    flag.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleToggleFlag = (flag: FeatureFlag) => {
    const newEnabled = !flag.enabled;
    setFeatureFlags((flags) =>
      flags.map((f) => (f.id === flag.id ? { ...f, enabled: newEnabled } : f)),
    );
    showToast(`${flag.name} ${newEnabled ? "enabled" : "disabled"}`);
  };

  const handleRolloutChange = (flagId: string, rolloutPercentage: number) => {
    setFeatureFlags((flags) =>
      flags.map((f) => (f.id === flagId ? { ...f, rolloutPercentage } : f)),
    );
  };

  const handleOpenCreateModal = () => {
    setCreateModalOpen(true);
    setCreateName("");
    setCreateDescription("");
    setNameError(null);
  };

  const handleCloseCreateModal = () => {
    setCreateModalOpen(false);
    setCreateName("");
    setCreateDescription("");
    setNameError(null);
  };

  const handleConfirmCreate = () => {
    const trimmedName = createName.trim();
    if (!trimmedName) {
      setNameError("Name is required");
      return;
    }
    const nameExists = featureFlags.some(
      (flag) => flag.name.toLowerCase() === trimmedName.toLowerCase(),
    );
    if (nameExists) {
      setNameError("A flag with this name already exists");
      return;
    }
    const newFlag: FeatureFlag = {
      id: generateFlagId(),
      name: trimmedName,
      description: createDescription.trim(),
      enabled: false,
      rolloutPercentage: 0,
      createdAt: new Date().toISOString().split("T")[0],
    };
    setFeatureFlags((flags) => [...flags, newFlag]);
    showToast("Feature flag created");
    handleCloseCreateModal();
  };

  const showEmptySearchState = featureFlags.length > 0 && filteredFlags.length === 0;
  const showNoFlagsState = featureFlags.length === 0;

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-gray-900">Features</h1>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Create Feature Flag
        </button>
      </div>

      <input
        type="text"
        placeholder="Search feature flags..."
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {showNoFlagsState ? (
        <div className="py-12 text-center text-gray-500">No feature flags yet</div>
      ) : showEmptySearchState ? (
        <div className="py-12 text-center text-gray-500">No feature flags found</div>
      ) : (
        <div className="space-y-4">
          {filteredFlags.map((flag) => (
            <div key={flag.id} className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{flag.name}</p>
                  <p className="mt-1 text-sm text-gray-500">{flag.description}</p>
                  <p className="mt-2 text-xs text-gray-400">{formatDate(flag.createdAt)}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={flag.enabled}
                  onClick={() => handleToggleFlag(flag)}
                  className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    flag.enabled ? "bg-blue-600" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                      flag.enabled ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              {flag.enabled && (
                <div className="mt-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-gray-600">
                      {flag.rolloutPercentage}% of users
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={flag.rolloutPercentage}
                      onChange={(event) => handleRolloutChange(flag.id, Number(event.target.value))}
                      className="h-2 w-32 max-w-full rounded-lg appearance-none bg-gray-200 accent-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={createModalOpen}
        onClose={handleCloseCreateModal}
        onConfirm={handleConfirmCreate}
        title="Create Feature Flag"
        confirmLabel="Create"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="flag-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="flag-name"
              type="text"
              value={createName}
              onChange={(event) => {
                setCreateName(event.target.value);
                setNameError(null);
              }}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
          </div>
          <div>
            <label
              htmlFor="flag-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <input
              id="flag-description"
              type="text"
              value={createDescription}
              onChange={(event) => setCreateDescription(event.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
