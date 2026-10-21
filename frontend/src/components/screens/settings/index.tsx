import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { DualPillToggle } from '@/components/ui/pill-toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRescale } from '@/context/RescaleContext';
import { formatRecipeClipboardText } from '@/lib/parser-client';

export function SettingsScreen() {
  const navigate = useNavigate();
  const {
    settings,
    updateSettings,
    savedRecipes,
    clearAllSavedRecipes,
    pushToast,
  } = useRescale();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const handleExportAll = () => {
    const content =
      savedRecipes.length === 0
        ? 'Rescale — No saved recipes stored on this device.\n'
        : savedRecipes
            .map((recipe) => formatRecipeClipboardText(recipe))
            .join('\n\n' + '═'.repeat(48) + '\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'rescale-saved-recipes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    pushToast('Exported recipes as .txt file 📤');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6 max-w-2xl"
    >
      <div>
        <button
          type="button"
          onClick={() => navigate('/app')}
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-text-secondary hover:text-text-primary cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          <span>Back</span>
        </button>
      </div>

      <div>
        <h1 className="font-sans text-[24px] font-semibold text-text-primary">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-text-secondary">
          All preferences save automatically to your browser LocalStorage.
        </p>
      </div>

      {/* Defaults Section */}
      <Card className="p-6 space-y-5">
        <h2 className="font-mono text-[12px] font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-2.5">
          Defaults
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="block text-[15px] font-medium text-text-primary">
              Preferred Unit System
            </span>
            <span className="text-[13px] text-text-secondary">
              Default unit system applied to newly parsed recipes
            </span>
          </div>
          <DualPillToggle
            ariaLabel="Preferred unit system"
            options={[
              { value: 'us', label: 'US' },
              { value: 'metric', label: 'Metric' },
            ]}
            value={settings.preferredUnitSystem}
            onChange={(val) => updateSettings({ preferredUnitSystem: val })}
          />
        </div>

        <div className="h-[1px] bg-border/70" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="block text-[15px] font-medium text-text-primary">
              Default Scale
            </span>
            <span className="text-[13px] text-text-secondary">
              Starting multiplier when opening a newly parsed recipe
            </span>
          </div>
          <Select
            value={String(settings.defaultScale)}
            onValueChange={(val) =>
              updateSettings({ defaultScale: parseFloat(val) })
            }
          >
            <SelectTrigger aria-label="Default scale">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0.5">½x</SelectItem>
              <SelectItem value="1">1x</SelectItem>
              <SelectItem value="1.5">1.5x</SelectItem>
              <SelectItem value="2">2x</SelectItem>
              <SelectItem value="3">3x</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="h-[1px] bg-border/70" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="block text-[15px] font-medium text-text-primary">
              Temperature Unit
            </span>
            <span className="text-[13px] text-text-secondary">
              Oven and stovetop temperatures in instruction steps
            </span>
          </div>
          <DualPillToggle
            ariaLabel="Temperature unit"
            options={[
              { value: 'F', label: '°F' },
              { value: 'C', label: '°C' },
            ]}
            value={settings.temperatureUnit}
            onChange={(val) => updateSettings({ temperatureUnit: val })}
          />
        </div>
      </Card>

      {/* Cook Mode Section */}
      <Card className="p-6 space-y-4">
        <h2 className="font-mono text-[12px] font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-2.5">
          Cook Mode
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="block text-[15px] font-medium text-text-primary">
              Timer Sound
            </span>
            <span className="text-[13px] text-text-secondary">
              Play gentle chime when a Cook Mode step countdown finishes
            </span>
          </div>
          <DualPillToggle
            ariaLabel="Timer sound toggle"
            options={[
              { value: 'on', label: 'On' },
              { value: 'off', label: 'Off' },
            ]}
            value={settings.timerSound ? 'on' : 'off'}
            onChange={(val) => updateSettings({ timerSound: val === 'on' })}
          />
        </div>
      </Card>

      {/* Data Section */}
      <Card className="p-6 space-y-4">
        <h2 className="font-mono text-[12px] font-semibold uppercase tracking-wider text-text-muted border-b border-border pb-2.5">
          Data
        </h2>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
          <Button
            type="button"
            variant="danger"
            onClick={() => setConfirmClearOpen(true)}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.5} />
            <span>Clear All Saved Recipes</span>
          </Button>

          <Button type="button" variant="ghost" onClick={handleExportAll}>
            <Download className="h-4 w-4" strokeWidth={1.5} />
            <span>Export All as Text File</span>
          </Button>
        </div>
      </Card>

      {/* Confirmation Dialog for Clearing Saved Recipes */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogTitle>Clear all saved recipes?</DialogTitle>
          <DialogDescription>
            This permanently deletes all {savedRecipes.length} locally saved
            recipes from this browser. This action cannot be undone.
          </DialogDescription>
          <div className="mt-6 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setConfirmClearOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => {
                clearAllSavedRecipes();
                setConfirmClearOpen(false);
              }}
            >
              Clear All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
