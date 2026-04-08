import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
// CharacterDecomposition component
import { makemeahanziService, type HanziCharacter } from '@/services/makemeahanziService';
import { Lightbulb, BookOpen, GitBranch, Type } from 'lucide-react';

interface CharacterDecompositionProps {
  character: string;
}

export const CharacterDecomposition = ({ character }: CharacterDecompositionProps) => {
  const [charData, setCharData] = useState<HanziCharacter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await makemeahanziService.loadData();
      const data = makemeahanziService.getCharacter(character);
      setCharData(data || null);
      setLoading(false);
    };
    loadData();
  }, [character]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!charData) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No decomposition data available for this character.</p>
        </CardContent>
      </Card>
    );
  }

  // Parse decomposition structure
  const getStructureType = (decomp: string): string => {
    if (decomp.startsWith('⿰')) return 'Left-Right (⿰)';
    if (decomp.startsWith('⿱')) return 'Top-Bottom (⿱)';
    if (decomp.startsWith('⿲')) return 'Left-Middle-Right (⿲)';
    if (decomp.startsWith('⿳')) return 'Top-Middle-Bottom (⿳)';
    if (decomp.startsWith('⿴')) return 'Full Surround (⿴)';
    if (decomp.startsWith('⿵')) return 'Surround from Top (⿵)';
    if (decomp.startsWith('⿶')) return 'Surround from Bottom (⿶)';
    if (decomp.startsWith('⿷')) return 'Surround from Left (⿷)';
    if (decomp.startsWith('⿸')) return 'Surround from Upper Left (⿸)';
    if (decomp.startsWith('⿹')) return 'Surround from Upper Right (⿹)';
    if (decomp.startsWith('⿺')) return 'Surround from Lower Left (⿺)';
    if (decomp.startsWith('⿻')) return 'Overlay (⿻)';
    return 'Simple';
  };

  // Extract component characters
  const extractComponents = (decomp: string): string[] => {
    return decomp.replace(/[⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻？]/g, '').split('').filter(c => c.trim());
  };

  const components = extractComponents(charData.decomposition);
  const structureType = getStructureType(charData.decomposition);

  return (
    <div className="space-y-4">
      {/* Main decomposition card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="w-5 h-5" />
            Character Decomposition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Structure type */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Structure:</span>
            <Badge variant="secondary">{structureType}</Badge>
          </div>

          {/* Components */}
          {components.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Components:</span>
              <div className="flex flex-wrap gap-2">
                {components.map((comp, idx) => {
                  const compData = makemeahanziService.getCharacter(comp);
                  return (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg"
                    >
                      <span className="text-2xl font-bold">{comp}</span>
                      <div className="text-xs">
                        {compData?.definition && (
                          <span className="text-muted-foreground block">{compData.definition}</span>
                        )}
                        {compData?.pinyin && compData.pinyin.length > 0 && (
                          <span className="text-primary">{compData.pinyin.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Decomposition formula */}
          <div className="p-3 bg-muted/50 rounded-lg font-mono text-sm">
            {charData.decomposition}
          </div>
        </CardContent>
      </Card>

      {/* Etymology */}
      {charData.etymology && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Etymology & Memory Aid
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {charData.etymology.type === 'ideographic' ? 'Ideographic' : 'Pictophonetic'}
              </Badge>
            </div>
            
            {charData.etymology.hint && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm">{charData.etymology.hint}</p>
              </div>
            )}

            {charData.etymology.phonetic && (
              <div className="text-sm">
                <span className="text-muted-foreground">Phonetic component: </span>
                <span className="font-medium">{charData.etymology.phonetic}</span>
              </div>
            )}

            {charData.etymology.semantic && (
              <div className="text-sm">
                <span className="text-muted-foreground">Semantic component: </span>
                <span className="font-medium">{charData.etymology.semantic}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Radical info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Type className="w-5 h-5" />
            Radical Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 flex items-center justify-center bg-primary/10 rounded-lg">
              <span className="text-3xl font-bold">{charData.radical}</span>
            </div>
            <div>
              {(() => {
                const radicalData = makemeahanziService.getCharacter(charData.radical);
                return (
                  <div className="space-y-1">
                    <div className="font-medium">Radical: {charData.radical}</div>
                    {radicalData?.definition && (
                      <div className="text-sm text-muted-foreground">{radicalData.definition}</div>
                    )}
                    {radicalData?.pinyin && radicalData.pinyin.length > 0 && (
                      <div className="text-sm text-primary">{radicalData.pinyin.join(', ')}</div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Character matches (stroke positions) */}
      {charData.matches && charData.matches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Stroke-to-Component Mapping
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {charData.matches.map((match, idx) => (
                <div
                  key={idx}
                  className={`w-6 h-6 flex items-center justify-center rounded text-xs ${
                    match !== null 
                      ? 'bg-primary/20 text-primary font-medium' 
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {match !== null ? match : '?'}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CharacterDecomposition;
