import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FolderOpen, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useRescale } from '@/context/RescaleContext';

function pickRecipeEmoji(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('cookie')) return '🍪';
  if (lower.includes('cake') || lower.includes('cupcake')) return '🍰';
  if (lower.includes('pancake') || lower.includes('waffle')) return '🥞';
  if (lower.includes('bread') || lower.includes('brioche') || lower.includes('sourdough'))
    return '🍞';
  if (lower.includes('pasta') || lower.includes('spaghetti') || lower.includes('noodle'))
    return '🍝';
  if (lower.includes('soup') || lower.includes('stew') || lower.includes('chili'))
    return '🍲';
  if (lower.includes('salad')) return '🥗';
  if (lower.includes('pizza')) return '🍕';
  if (lower.includes('pie') || lower.includes('tart')) return '🥧';
  if (lower.includes('curry')) return '🍛';
  return '🍽️';
}

function formatSavedRelative(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Saved today';
  if (days === 1) return 'Saved 1 day ago';
  return `Saved ${days} days ago`;
}

export function SavedRecipesScreen() {
  const navigate = useNavigate();
  const { savedRecipes, openSavedRecipe, deleteSavedRecipe } = useRescale();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return savedRecipes;
    return savedRecipes.filter((r) => r.title.toLowerCase().includes(q));
  }, [savedRecipes, query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="space-y-6"
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

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-sans text-[24px] font-semibold text-text-primary">
          Saved Recipes
        </h1>
        <Button asChild size="sm">
          <Link to="/app">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            <span>New Recipe</span>
          </Link>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-text-muted"
          strokeWidth={1.5}
        />
        <Input
          placeholder="Search saved recipes..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Empty State vs Saved Cards */}
      {savedRecipes.length === 0 ? (
        <Card className="py-16 px-6 text-center flex flex-col items-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-surface-raised text-accent">
            <FolderOpen className="h-12 w-12" strokeWidth={1.5} />
          </div>
          <h2 className="font-display text-[32px] leading-snug text-text-primary">
            No saved recipes yet
          </h2>
          <p className="mt-1 text-[16px] text-text-secondary">
            Paste a recipe to get started
          </p>
          <Button asChild className="mt-6">
            <Link to="/app">
              <Plus className="h-4 w-4" strokeWidth={1.5} />
              <span>Add Your First Recipe</span>
            </Link>
          </Button>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="py-12 px-6 text-center text-text-secondary">
          No saved recipes match &ldquo;{query}&rdquo;.
        </Card>
      ) : (
        <div className="space-y-3.5">
          {filtered.map((recipe) => (
            <Card
              key={recipe.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start sm:items-center gap-3.5">
                <span className="text-[28px] leading-none select-none">
                  {pickRecipeEmoji(recipe.title)}
                </span>
                <div>
                  <h2 className="font-sans text-[17px] font-semibold text-text-primary">
                    {recipe.title}
                  </h2>
                  <p className="mt-0.5 text-[13px] font-mono text-text-secondary">
                    {recipe.targetServings} servings ·{' '}
                    {formatSavedRelative(recipe.savedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    openSavedRecipe(recipe);
                    navigate('/app/recipe');
                  }}
                >
                  Open
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => deleteSavedRecipe(recipe.id)}
                >
                  <span>Delete</span>
                  <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Privacy & Storage Note */}
      <p className="text-center text-[13px] text-text-muted pt-4">
        Stored locally on this device only · 💾 {savedRecipes.length}{' '}
        {savedRecipes.length === 1 ? 'recipe' : 'recipes'} saved
      </p>
    </motion.div>
  );
}
