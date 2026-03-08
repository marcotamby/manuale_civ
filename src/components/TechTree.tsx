import { ArrowRight, Box } from 'lucide-react';

interface TechTreeProps {
  civId: string;
}

export function TechTree({ civId: _civId }: TechTreeProps) {
  return (
    <div className="glass p-8 rounded-2xl overflow-x-auto w-full">
      <h2 className="text-2xl font-bold mb-8 text-white">Building & Technology Dependencies</h2>
      
      <div className="flex items-start min-w-max gap-4">
        {/* Age I */}
        <div className="flex flex-col items-center gap-4 w-40">
          <div className="text-yellow-500 font-bold mb-2 tracking-wider">Dark Age (I)</div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-yellow-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Town Center</span>
          </div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-yellow-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Barracks</span>
          </div>
        </div>
        
        <div className="pt-20 flex flex-col gap-12">
          <ArrowRight className="text-gray-600" size={32} />
          <ArrowRight className="text-gray-600" size={32} />
        </div>
        
        {/* Age II */}
        <div className="flex flex-col items-center gap-4 w-40">
          <div className="text-blue-500 font-bold mb-2 tracking-wider">Feudal Age (II)</div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-blue-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Blacksmith</span>
          </div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-blue-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Archery Range</span>
          </div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-blue-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Stable</span>
          </div>
        </div>

        <div className="pt-32">
          <ArrowRight className="text-gray-600" size={32} />
        </div>

        {/* Age III */}
        <div className="flex flex-col items-center gap-4 w-40">
          <div className="text-purple-500 font-bold mb-2 tracking-wider">Castle Age (III)</div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-purple-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Siege Workshop</span>
          </div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-purple-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Monastery</span>
          </div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-purple-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">Keep</span>
          </div>
        </div>

        <div className="pt-20">
          <ArrowRight className="text-gray-600" size={32} />
        </div>

        {/* Age IV */}
        <div className="flex flex-col items-center gap-4 w-40">
          <div className="text-red-500 font-bold mb-2 tracking-wider">Imperial Age (IV)</div>
          <div className="glass w-full p-4 rounded-xl border-t-2 border-red-500 flex flex-col items-center gap-2 hover:-translate-y-1 transition-transform">
            <Box size={24} className="text-gray-400" />
            <span className="font-semibold text-sm">University</span>
          </div>
        </div>
        
      </div>
    </div>
  );
}
