
'use client';

import React from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RotateCcw, Sparkles, Glasses, Palette, Wand2, ArrowLeft, Smile, Frown, Heart, Ghost, Paintbrush, Pipette, Camera, ArrowRight, ArrowUp, ArrowDown, ArrowUpRight, ArrowUpLeft, Square, User as UserIcon, Eye, Meh, ChevronsRight, Save, Users, Clock, Loader2, Captions, Droplet, Ban, Plus, Hand } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import type { Expression, MenuType, AnimationType, ShapeType, FeatureStyle, ModelType } from '@/app/design/page';

type DesignToolbarProps = {
    activeMenu: MenuType;
    setActiveMenu: (menu: MenuType) => void;
    expression: Expression;
    setExpression: (exp: Expression) => void;
    background_color: string;
    setBackgroundColor: (color: string) => void;
    emoji_color: string;
    setEmojiColor: (color: string) => void;
    show_sunglasses: boolean;
    setShowSunglasses: (show: boolean) => void;
    show_mustache: boolean;
    setShowMustache: (show: boolean) => void;
    selected_filter: string | null;
    setSelectedFilter: (filter: string | null) => void;
    filters: { name: string; style: any; css: string; }[];
    animation_type: AnimationType;
    setAnimationType: (type: AnimationType) => void;
    shape: ShapeType;
    setShape: (shape: ShapeType) => void;
    model: ModelType;
    eye_style: FeatureStyle;
    setEyeStyle: (style: FeatureStyle) => void;
    mouth_style: FeatureStyle;
    setMouthStyle: (style: FeatureStyle) => void;
    eyebrow_style: FeatureStyle;
    setEyebrowStyle: (style: FeatureStyle) => void;
    caption: string;
    setCaption: (caption: string) => void;
    handleReset: () => void;
    handleSave: () => void;
    handleRandomize: () => void;
}

export const DesignToolbar = (props: DesignToolbarProps) => {

    const {
        activeMenu, setActiveMenu, expression, setExpression, background_color, setBackgroundColor,
        emoji_color, setEmojiColor, show_sunglasses, setShowSunglasses, show_mustache, setShowMustache,
        selected_filter, setSelectedFilter, filters, animation_type, setAnimationType, shape, setShape,
        model, eye_style, setEyeStyle, mouth_style, setMouthStyle, eyebrow_style, setEyebrowStyle,
        caption, setCaption, handleReset, handleSave, handleRandomize
    } = props;

    const handleFilterSelect = (filterName: string) => {
        if (selected_filter === filterName) {
            setSelectedFilter(null); // Deselect
        } else {
            setSelectedFilter(filterName);
        }
    };
    
    const handleExpressionToggle = (newExpression: Expression) => {
        setExpression(newExpression);
    };
    
    const handleShapeToggle = (newShape: ShapeType) => {
        if (shape === newShape) {
            setShape('default');
        } else {
            setShape(newShape);
        }
    };

    const handleFeatureSelect = (
        type: 'eye' | 'mouth' | 'eyebrow', 
        style: FeatureStyle
      ) => {
        if (type === 'eye') {
            setEyeStyle(style);
        } else if (type === 'mouth') {
            setMouthStyle(style);
        } else {
            setEyebrowStyle(style);
        }
      };

      const renderFeatureMenu = (
        type: 'eye' | 'mouth' | 'eyebrow', 
        currentStyle: FeatureStyle
      ) => {
        const featureStyles: {name: FeatureStyle, label: string}[] = [
            {name: 'male-1', label: 'Style 1'},
            {name: 'male-2', label: 'Style 2'},
            {name: 'male-3', label: 'Style 3'},
            {name: 'female-1', label: 'Style 4'},
            {name: 'female-2', label: 'Style 5'},
            {name: 'female-3', label: 'Style 6'},
        ];
    
        const title = type.charAt(0).toUpperCase() + type.slice(1);
    
        return (
            <div className="flex items-center w-full md:flex-col md:h-full">
                <Button variant="ghost" size="icon" onClick={() => setActiveMenu('face')} className="flex-shrink-0"><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                <Separator orientation="vertical" className="h-6 mx-2 flex-shrink-0 md:hidden" />
                <Separator orientation="horizontal" className="w-full my-2 flex-shrink-0 hidden md:block" />
                <span className="font-semibold text-sm mr-4 md:mr-0 md:mb-4">{title}</span>
                 <div className="flex-1 flex items-center gap-2 overflow-x-auto pr-4 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:h-full md:pr-0 md:w-full">
                    {featureStyles.map(style => (
                        <Tooltip key={style.name}>
                            <TooltipTrigger asChild>
                                <Button 
                                    variant={currentStyle === style.name ? 'default' : 'outline'}
                                    onClick={() => handleFeatureSelect(type, style.name)}
                                    className="md:w-full"
                                >
                                    {style.label}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>{style.label}</p></TooltipContent>
                        </Tooltip>
                    ))}
                 </div>
            </div>
        )
      }

      const renderMenu = () => {
        switch (activeMenu) {
          case 'caption':
            return (
              <div className="flex items-center w-full p-2 md:flex-col md:h-full">
                <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')} className="flex-shrink-0"><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                <Separator orientation="vertical" className="h-6 mx-2 flex-shrink-0 md:hidden" />
                <Separator orientation="horizontal" className="w-full my-2 flex-shrink-0 hidden md:block" />
                <div className="relative w-full h-full">
                     <Textarea 
                        id="caption"
                        placeholder="Add a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        maxLength={30}
                        className="pr-12 h-10 md:h-full resize-none text-sm"
                        rows={1}
                     />
                     <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                        {caption.length}/30
                     </div>
                </div>
              </div>
            )
          case 'expressions':
            return (
              <div className="flex items-center md:flex-col md:gap-1">
                <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')}><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                <Separator orientation="vertical" className="h-6 mx-2 md:hidden" />
                <Separator orientation="horizontal" className="w-full my-1 hidden md:block" />
                <Tooltip><TooltipTrigger asChild><Button variant={expression === 'happy' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleExpressionToggle('happy')}><Smile className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Happy</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant={expression === 'sad' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleExpressionToggle('sad')}><Frown className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Sad</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant={expression === 'scared' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleExpressionToggle('scared')}><Ghost className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Scared</p></TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant={expression === 'love' ? 'secondary' : 'ghost'} size="icon" onClick={() => handleExpressionToggle('love')}><Heart className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Love</p></TooltipContent></Tooltip>
              </div>
            );
          case 'shapes':
            const shapes: { name: ShapeType; icon: React.ElementType, label: string }[] = [
                { name: 'default', icon: Square, label: 'Default' },
                { name: 'sphere', icon: Square, label: 'Sphere' },
                { name: 'square', icon: Square, label: 'Square' },
                { name: 'squircle', icon: Square, label: 'Squircle' },
                { name: 'tear', icon: Droplet, label: 'Tear' },
                { name: 'blob', icon: Droplet, label: 'Blob' },
            ];
            return (
              <div className="flex items-center md:flex-col md:gap-1">
                <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')}><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                <Separator orientation="vertical" className="h-6 mx-2 md:hidden" />
                 <Separator orientation="horizontal" className="w-full my-1 hidden md:block" />
                {shapes.map(({ name, icon: Icon, label }) => (
                    <Tooltip key={name}>
                        <TooltipTrigger asChild>
                            <Button 
                                variant={shape === name ? 'secondary' : 'ghost'} 
                                onClick={() => handleShapeToggle(name)}
                                disabled={(model === 'loki' && name === 'blob')}
                                className="md:w-full"
                            >
                                <Icon className="mr-2 h-4 w-4 md:mr-0"/>
                                <span className="md:hidden">{label}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{label}</p></TooltipContent>
                    </Tooltip>
                ))}
              </div>
            );
          case 'colors':
            return (
              <div className="flex items-center md:flex-col md:gap-1">
                <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')}><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                <Separator orientation="vertical" className="h-6 mx-2 md:hidden" />
                <Separator orientation="horizontal" className="w-full my-1 hidden md:block" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Label htmlFor="bg-color-input" className={cn(buttonVariants({variant: 'ghost', size: 'icon'}))}>
                            <Paintbrush className="h-4 w-4"/>
                            <Input id="bg-color-input" type="color" value={background_color} onChange={(e) => setBackgroundColor(e.target.value)} className="sr-only" />
                        </Label>
                    </TooltipTrigger>
                    <TooltipContent><p>Background Color</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Label htmlFor="face-color-input" className={cn(buttonVariants({variant: 'ghost', size: 'icon'}))}>
                            <Pipette className="h-4 w-4"/>
                            <Input id="face-color-input" type="color" value={emoji_color} onChange={(e) => setEmojiColor(e.target.value)} className="sr-only" />
                        </Label>
                    </TooltipTrigger>
                    <TooltipContent><p>{model === 'loki' ? 'Clock Color' : 'Face Color'}</p></TooltipContent>
                </Tooltip>
              </div>
            );
          case 'accessories':
            return (
              <div className="flex items-center md:flex-col md:gap-1">
                <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')}><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                <Separator orientation="vertical" className="h-6 mx-2 md:hidden" />
                <Separator orientation="horizontal" className="w-full my-1 hidden md:block" />
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Label htmlFor="sunglasses-switch" className={cn(buttonVariants({variant: 'ghost', size: 'icon'}), "flex items-center gap-2 cursor-pointer", show_sunglasses && "bg-accent text-accent-foreground")}>
                            <Glasses className="h-4 w-4" />
                            <Switch id="sunglasses-switch" checked={show_sunglasses} onCheckedChange={setShowSunglasses} className="sr-only" />
                        </Label>
                    </TooltipTrigger>
                    <TooltipContent><p>Toggle Sunglasses</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Label htmlFor="mustache-switch" className={cn(buttonVariants({variant: 'ghost', size: 'icon'}), "flex items-center gap-2 cursor-pointer", show_mustache && "bg-accent text-accent-foreground")}>
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.25,12.05c0,5.65-4.14,7.2-9.25,7.2S3.75,17.7,3.75,12.05c0-4.06,2.23-5.23,3.73-6.23C8.5,5,9.5,2,13,2s4.5,3,5.5,3.82C20,6.82,22.25,7.99,22.25,12.05Z"/></svg>
                            <Switch id="mustache-switch" checked={show_mustache} onCheckedChange={setShowMustache} className="sr-only" />
                        </Label>
                    </TooltipTrigger>
                    <TooltipContent><p>Toggle Mustache</p></TooltipContent>
                </Tooltip>
              </div>
            );
          case 'filters':
            return (
                <div className="flex items-center w-full md:flex-col md:h-full">
                    <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')} className="flex-shrink-0"><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                    <Separator orientation="vertical" className="h-6 mx-2 flex-shrink-0 md:hidden" />
                    <Separator orientation="horizontal" className="w-full my-2 flex-shrink-0 hidden md:block" />
                    <div className="flex-1 flex items-center gap-3 overflow-x-auto pr-4 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:h-full md:pr-0 md:w-full">
                        {filters.map(filter => (
                            <Tooltip key={filter.name}>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => handleFilterSelect(filter.name)}
                                        className={cn(
                                            "w-12 h-12 rounded-lg flex-shrink-0 border-2 transition-all duration-200 md:w-20 md:h-20",
                                            selected_filter === filter.name ? 'border-primary scale-110' : 'border-border'
                                        )}
                                    >
                                        <div className="w-full h-full rounded-md" style={filter.style}></div>
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent><p>{filter.name}</p></TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </div>
            );
            case 'animations':
                 const animations: { name: AnimationType, icon: React.ElementType, label: string }[] = [
                    { name: 'left-right', icon: ArrowRight, label: 'L-R' },
                    { name: 'right-left', icon: ArrowLeft, label: 'R-L' },
                    { name: 'up-down', icon: ArrowDown, label: 'U-D' },
                    { name: 'down-up', icon: ArrowUp, label: 'D-U' },
                    { name: 'diag-left-right', icon: ArrowUpRight, label: 'Diag L-R' },
                    { name: 'diag-right-left', icon: ArrowUpLeft, label: 'Diag R-L' },
                    { name: 'random', icon: Wand2, label: 'Random' },
                    { name: 'none', icon: Ban, label: 'None' },
                ];
                return (
                    <div className="flex items-center w-full md:flex-col md:h-full">
                        <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')}><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                        <Separator orientation="vertical" className="h-6 mx-2 md:hidden" />
                        <Separator orientation="horizontal" className="w-full my-2 hidden md:block" />
                        <div className="flex-1 grid grid-cols-4 grid-rows-2 md:grid-cols-2 md:grid-rows-4 gap-2 w-full">
                            {animations.map(({name, icon: Icon, label}) => (
                                <Tooltip key={name}>
                                    <TooltipTrigger asChild>
                                        <Button 
                                            variant={animation_type === name ? 'default' : 'outline'}
                                            size="icon"
                                            onClick={() => setAnimationType(name)}
                                            className="aspect-square h-auto w-full"
                                        >
                                            <Icon className="h-5 w-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>{label}</p></TooltipContent>
                                </Tooltip>
                            ))}
                        </div>
                    </div>
                );
          case 'face':
            return (
                <div className="flex items-center md:flex-col md:gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setActiveMenu('main')}><ArrowLeft className="h-4 w-4 md:hidden" /><ArrowUp className="h-4 w-4 hidden md:block" /></Button>
                    <Separator orientation="vertical" className="h-6 mx-2 md:hidden" />
                     <Separator orientation="horizontal" className="w-full my-1 hidden md:block" />
                    <Button variant="ghost" className="md:w-full md:justify-start" onClick={() => setActiveMenu('eyes')}><Eye className="mr-2 h-4 w-4" /> Eyes</Button>
                    <Button variant="ghost" className="md:w-full md:justify-start" onClick={() => setActiveMenu('mouth')}><Meh className="mr-2 h-4 w-4" /> Mouth</Button>
                    <Button variant="ghost" className="md:w-full md:justify-start" onClick={() => setActiveMenu('eyebrows')}><ChevronsRight className="mr-2 h-4 w-4" style={{transform: 'rotate(-45deg)'}} /> Eyebrows</Button>
                </div>
            )
          case 'eyes':
            return renderFeatureMenu('eye', eye_style);
          case 'mouth':
            return renderFeatureMenu('mouth', mouth_style);
          case 'eyebrows':
            return renderFeatureMenu('eyebrow', eyebrow_style);
          default: // 'main'
            const mainTools = [
                { name: 'New', icon: RotateCcw, action: handleReset, menu: null },
                { name: 'Save', icon: Save, action: handleSave, menu: null },
                { name: 'Caption', icon: Captions, action: () => setActiveMenu('caption'), menu: 'caption' },
                { name: 'Expressions', icon: Smile, action: () => setActiveMenu('expressions'), menu: 'expressions' },
                { name: 'Face', icon: UserIcon, action: () => setActiveMenu('face'), menu: 'face' },
                { name: 'Animations', icon: Sparkles, action: () => setActiveMenu('animations'), menu: 'animations' },
                { name: 'Shapes', icon: Square, action: () => setActiveMenu('shapes'), menu: 'shapes' },
                { name: 'Colors', icon: Palette, action: () => setActiveMenu('colors'), menu: 'colors' },
                { name: 'Accessories', icon: Glasses, action: () => setActiveMenu('accessories'), menu: 'accessories' },
                { name: 'Filters', icon: Camera, action: () => setActiveMenu('filters'), menu: 'filters' },
                { name: 'Random', icon: Wand2, action: handleRandomize, menu: null }
            ];
    
            return (
                <div className="flex items-center justify-center space-x-1 md:space-x-0 md:flex-col md:space-y-1">
                    {mainTools.map((tool) => {
                        return (
                            <React.Fragment key={tool.name}>
                                 {(tool.name === 'Caption' || tool.name === 'Random') && <Separator orientation="vertical" className="h-full mx-1 md:h-px md:w-full md:my-1" />}
                                 <Button variant="ghost" className="h-auto p-1 flex flex-col" onClick={tool.action}>
                                    <tool.icon className="h-4 w-4" />
                                    <span className="text-xs mt-1">{tool.name}</span>
                                </Button>
                            </React.Fragment>
                        )
                    })}
                </div>
            );
        }
      };

    return (
        <div className="fixed bottom-[56px] left-0 right-0 z-20 w-full max-w-md mx-auto md:relative md:bottom-auto md:max-w-none md:w-auto md:h-full md:mx-0">
            <div className="flex flex-col bg-background/80 backdrop-blur-sm border-t border-border md:border-t-0 md:border-l md:h-full">
                <ScrollArea className="w-full whitespace-nowrap no-scrollbar md:h-full md:whitespace-normal">
                    <div className="flex items-center justify-center w-max space-x-1 p-2 mx-auto h-16 md:w-auto md:h-full md:flex-col md:space-x-0 md:space-y-1">
                        {renderMenu()}
                    </div>
                    <ScrollBar orientation="horizontal" className="hidden md:hidden" />
                    <ScrollBar orientation="vertical" className="hidden md:flex" />
                </ScrollArea>
            </div>
        </div>
    )
}
