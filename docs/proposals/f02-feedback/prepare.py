"""Create a review patch. Does not write application source."""
from pathlib import Path
import difflib

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
SOURCE = ROOT / 'frontend/PlanClient'
relative = 'src/pages/DashboardOverview.jsx'
original = (SOURCE / relative).read_text(encoding='utf-8')
text = original

def replace(old, new):
    global text
    if text.count(old) != 1:
        raise RuntimeError('Unexpected source: ' + old[:80])
    text = text.replace(old, new, 1)

replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect, useRef } from 'react';")
replace("import { Badge } from '@/components/ui/badge';", "import { Badge } from '@/components/ui/badge';\nimport { Feedback } from '@/components/ui/feedback';\nimport { ConfirmDialog } from '@/components/ui/confirm-dialog';")
replace('  const [loadingPlans, setLoadingPlans] = useState(true);', '''  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState(false);
  const [plansReload, setPlansReload] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const designsFocusRef = useRef(null);''')
replace("    getMyPlans()\n      .then(setPlans)\n      .catch((err) => console.error('Failed to load plans', err))\n      .finally(() => setLoadingPlans(false));", '')
replace('  // Compute Stats', '''  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyPlans()
      .then((data) => { if (!cancelled) setPlans(data); })
      .catch(() => { if (!cancelled) setPlansError(true); })
      .finally(() => { if (!cancelled) setLoadingPlans(false); });
    return () => { cancelled = true; };
  }, [user, plansReload]);

  const retryPlans = () => {
    setPlansError(false);
    setLoadingPlans(true);
    setPlansReload((count) => count + 1);
  };

  // Compute Stats''')
start = text.index('  // Handle plan delete')
end = text.index('  const handleSubmitPlan', start)
text = text[:start] + '''  // Backend still authorizes ownership and draft-only deletion.
  const handleDeletePlan = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deletePlan(deleteTarget.id);
      setPlans((current) => current.filter((plan) => plan.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError('The design could not be deleted. It may no longer be a draft. Refresh the page to check its status before trying again.');
    } finally {
      setDeleting(false);
    }
  };

''' + text[end:]
start = text.index('            {loadingPlans ? (')
end = text.index('              <div className="grid grid-cols-1', start)
text = text[:start] + '''            <h2 ref={designsFocusRef} tabIndex={-1} className="ui-section-title mb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">My Designs</h2>
            {loadingPlans ? (
              <Feedback kind="loading" title="Loading designs" description="Retrieving your design library." />
            ) : plansError ? (
              <Feedback kind="error" title="Could not load designs" description="Check your connection and try again." actionLabel="Try again" onAction={retryPlans} />
            ) : plans.length === 0 ? (
              <Feedback title="No designs yet" description="Upload your first design to get started." actionLabel="Upload a design" onAction={() => openPlanModal()} />
            ) : (
''' + text[end:]
replace('onClick={() => handleDeletePlan(plan.id)}', '''aria-label={`Delete ${plan.title}`}
                              onClick={() => { setDeleteError(''); setDeleteTarget(plan); }}''')
replace('onClick={() => openPlanModal(plan)}', 'aria-label={`Edit ${plan.title}`}\n                              onClick={() => openPlanModal(plan)}')
# A failed design request must not present a confident zero count.
replace('{plans.length}</h3>', "{loadingPlans ? '…' : plansError ? 'Unavailable' : plans.length}</h3>")
anchor = '    </div>\n  );\n}'
replace(anchor, '''      {deleteTarget && (
        <ConfirmDialog
          title={`Delete “${deleteTarget.title}”?`}
          description="This permanently removes the draft design. This action cannot be undone."
          confirmLabel="Delete design"
          busyLabel="Deleting…"
          errorTitle="Deletion failed"
          busy={deleting}
          error={deleteError}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeletePlan}
          returnFocusRef={designsFocusRef}
        />
      )}
    </div>
  );
}''')
target = OUT / 'proposed' / relative
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(text, encoding='utf-8')
patch = []
for proposed in sorted((OUT / 'proposed').rglob('*.jsx')):
    relative = proposed.relative_to(OUT / 'proposed').as_posix()
    current = SOURCE / relative
    old = current.read_text(encoding='utf-8') if current.exists() else ''
    patch.extend(difflib.unified_diff(old.splitlines(True), proposed.read_text(encoding='utf-8').splitlines(True), fromfile='a/frontend/PlanClient/'+relative if current.exists() else '/dev/null', tofile='b/frontend/PlanClient/'+relative))
(OUT / 'f02-feedback.patch').write_text(''.join(patch), encoding='utf-8')
print('Prepared two new shared components and dashboard integration; application unchanged.')
