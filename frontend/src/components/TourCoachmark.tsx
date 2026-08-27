import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useTranslation } from '../i18n';

export type TourRect = { x: number; y: number; width: number; height: number };

// Measures a real on-screen element (via ref) only while `isActive` is true,
// so a step's target rect is (re)computed right when that step becomes
// current — e.g. right after a tab switch reveals the button we point at.
// `delayMs` can be bumped for targets that need to scroll into view first
// (see the create-tournament form, which calls scrollToEnd on this same
// transition) — the default covers a plain tab/modal appearing.
//
// The target may still be behind a data fetch (e.g. "Aggiungi squadra" only
// renders once the teams/matches request finishes) — the very first steps
// of a tour reliably land inside that window. A single fixed-delay
// measurement would just find `ref.current` still null and never retry, so
// the coachmark's target stayed null forever (silently falling back to
// banner mode) even after the button actually mounted a moment later. Retry
// on a short interval instead, until the ref exists or we give up.
export function useTourTarget(isActive: boolean, delayMs: number = 150) {
  const ref = useRef<View>(null);
  const [rect, setRect] = useState<TourRect | null>(null);

  useEffect(() => {
    if (!isActive) {
      setRect(null);
      return;
    }
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const measure = () => {
      if (ref.current) {
        ref.current.measureInWindow((x, y, width, height) => setRect({ x, y, width, height }));
        return;
      }
      attempts += 1;
      if (attempts < 20) {
        timer = setTimeout(measure, 150);
      }
    };
    timer = setTimeout(measure, delayMs);
    return () => clearTimeout(timer);
  }, [isActive, delayMs]);

  return { ref, rect };
}

interface TourCoachmarkProps {
  visible: boolean;
  // null = "banner" mode: no single element to point at (e.g. choosing a sport).
  target: TourRect | null;
  text: string;
  onSkip: () => void;
  // When set, shows an explicit "Avanti" button alongside "Salta tour" —
  // for steps that just explain a field (a form input, a filter chip) with
  // no single tap that means "done here", unlike a real action button which
  // advances the tour on its own when pressed.
  onNext?: () => void;
}

const PAD = 8;
const BELOW_THRESHOLD = 170;

// Deliberately NOT a <Modal>: Modal opens its own native window that
// swallows touches even with pointerEvents="box-none" on its content, so a
// coachmark rendered that way would block taps on the real button it's
// pointing at. Rendering as a plain absolutely-positioned sibling in the
// same view hierarchy as the target lets touches fall through the dimmed/
// cutout areas to whatever's really underneath. Because of this, each call
// site must render this as the LAST child of the screen (or Modal content)
// it's annotating, so it paints on top and shares that hierarchy.
export function TourCoachmark({ visible, target, text, onSkip, onNext }: TourCoachmarkProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  const { height: screenH } = Dimensions.get('window');

  const actions = (
    <View style={styles.actionsRow}>
      <TouchableOpacity onPress={onSkip}>
        <Text style={styles.skipText}>{t('tour.skip', 'Salta tour')}</Text>
      </TouchableOpacity>
      {onNext && (
        <TouchableOpacity style={styles.nextBtn} onPress={onNext}>
          <Text style={styles.nextBtnText}>{t('tour.next', 'Avanti')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (!target) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.bannerWrap]} pointerEvents="box-none">
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{text}</Text>
          {actions}
        </View>
      </View>
    );
  }

  const spotX = Math.max(target.x - PAD, 0);
  const spotY = Math.max(target.y - PAD, 0);
  const spotW = target.width + PAD * 2;
  const spotH = target.height + PAD * 2;
  const placeBelow = screenH - (spotY + spotH) > BELOW_THRESHOLD;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimmed strips around the cutout — none intercept touch, so the
          real button underneath the spotlight stays tappable. */}
      <View pointerEvents="none" style={[styles.dim, { top: 0, left: 0, right: 0, height: spotY }]} />
      <View pointerEvents="none" style={[styles.dim, { top: spotY + spotH, left: 0, right: 0, bottom: 0 }]} />
      <View pointerEvents="none" style={[styles.dim, { top: spotY, left: 0, width: spotX, height: spotH }]} />
      <View pointerEvents="none" style={[styles.dim, { top: spotY, left: spotX + spotW, right: 0, height: spotH }]} />

      <View pointerEvents="none" style={[styles.highlight, { left: spotX, top: spotY, width: spotW, height: spotH }]} />

      <View
        style={[
          styles.bubble,
          styles.bubbleFloating,
          placeBelow ? { top: spotY + spotH + 12 } : { bottom: screenH - spotY + 12 },
        ]}
      >
        <Text style={styles.bubbleText}>{text}</Text>
        {actions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    paddingTop: 70,
    paddingHorizontal: 20,
  },
  dim: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#FFF',
    borderRadius: 14,
  },
  bubbleFloating: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  bubble: {
    backgroundColor: '#000',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  bubbleText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    color: '#AAA',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  nextBtn: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  nextBtnText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
});
