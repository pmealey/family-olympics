import React from 'react';

export const Schedule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold">Schedule</h2>
      </div>

      {/* Day 1 */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-3 text-winter-gray">
          Day 1 - Saturday, TBD
        </h3>
        <div className="text-center py-8 text-winter-gray">
          <p>No events scheduled yet</p>
        </div>
      </div>

      {/* Day 2 */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-3 text-winter-gray">
          Day 2 - Sunday, TBD
        </h3>
        <div className="text-center py-8 text-winter-gray">
          <p>No events scheduled yet</p>
        </div>
      </div>
    </div>
  );
};
