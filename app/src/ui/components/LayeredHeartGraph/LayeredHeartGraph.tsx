import { createContext, type ComponentChildren, type JSX } from 'preact';
import { createPortal } from 'preact/compat';
import { useCallback, useContext, useState } from 'preact/hooks';

interface LayeredHeartGraphLayers {
  svgLayer: SVGSVGElement | null;
  overlayLayer: HTMLDivElement | null;
}

interface LayeredHeartGraphProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children' | 'className'> {
  children?: ComponentChildren;
  className?: string;
  heightClassName?: string;
  viewBox?: string;
}

interface LayerPortalProps {
  children?: ComponentChildren;
}

const LayeredHeartGraphContext = createContext<LayeredHeartGraphLayers>({
  svgLayer: null,
  overlayLayer: null,
});

function useLayeredHeartGraphLayers(): LayeredHeartGraphLayers {
  return useContext(LayeredHeartGraphContext);
}

export function LayeredHeartGraph({
  children,
  className = '',
  heightClassName = 'h-56',
  viewBox = '0 0 100 42',
  ...surfaceProps
}: LayeredHeartGraphProps) {
  const [svgLayer, setSvgLayer] = useState<SVGSVGElement | null>(null);
  const [overlayLayer, setOverlayLayer] = useState<HTMLDivElement | null>(null);
  const captureSvgLayer = useCallback((node: SVGSVGElement | null) => {
    setSvgLayer(node);
  }, []);
  const captureOverlayLayer = useCallback((node: HTMLDivElement | null) => {
    setOverlayLayer(node);
  }, []);

  return (
    <LayeredHeartGraphContext.Provider value={{ svgLayer, overlayLayer }}>
      <div
        class={`graph-surface relative w-full overflow-hidden rounded-[1.4rem] border border-[color:var(--line)] ${heightClassName} ${className}`}
        data-testid="layered-heart-graph"
        {...surfaceProps}
      >
        <svg
          ref={captureSvgLayer}
          viewBox={viewBox}
          preserveAspectRatio="none"
          class="absolute inset-0 block h-full w-full"
          data-testid="layered-heart-graph-svg-layer"
        />
        <div
          ref={captureOverlayLayer}
          class="pointer-events-none absolute inset-0"
          data-testid="layered-heart-graph-overlay-layer"
        />
        {children}
      </div>
    </LayeredHeartGraphContext.Provider>
  );
}

export function SvgLayerPortal({ children }: LayerPortalProps) {
  const { svgLayer } = useLayeredHeartGraphLayers();

  return svgLayer ? createPortal(children, svgLayer) : null;
}

export function OverlayLayerPortal({ children }: LayerPortalProps) {
  const { overlayLayer } = useLayeredHeartGraphLayers();

  return overlayLayer ? createPortal(children, overlayLayer) : null;
}
