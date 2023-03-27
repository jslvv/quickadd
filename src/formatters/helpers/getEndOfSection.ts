type Heading = {
	level: number;
	line: number;
	text: string;
};

function isSameHeading(heading1: Heading, heading2: Heading): boolean {
	return heading1.line === heading2.line;
}

function getMarkdownHeadings(bodyLines: string[]): Heading[] {
	const headers: Heading[] = [];

	bodyLines.forEach((line, index) => {
		const match = line.match(/^(#+)[\s]?(.*)$/);

		if (!match) return;

		headers.push({
			level: match[1].length,
			text: match[2],
			line: index,
		});
	});

	return headers;
}

/**
 *
 * @param lines Lines in body to find end of section
 * @param targetLine Target line to find end of section
 * @param shouldConsiderSubsections Whether to consider subsections as part of the section
 * @returns index of end of section
 */
export default function getEndOfSection(
	lines: string[],
	targetLine: number,
	shouldConsiderSubsections = false
): number {
	const headings = getMarkdownHeadings(lines);

	const targetHeading = headings.find(
		(heading) => heading.line === targetLine
	);
	const targetIsHeading = !!targetHeading;

	if (!targetIsHeading && shouldConsiderSubsections) {
		throw new Error(
			`Target line ${targetLine} is not a heading, but we are trying to find the end of its section.`
		);
	}

	if (!targetIsHeading && !shouldConsiderSubsections) {
		const nextEmptyStringIdx = findNextIdx(
			lines,
			targetLine,
			(str: string) => str.trim() === ""
		);

		if (nextEmptyStringIdx !== null && nextEmptyStringIdx > targetLine) {
			return nextEmptyStringIdx - 1;
		}

		return targetLine;
	}

	const lastLineInBodyIdx = lines.length - 1;
	const endOfSectionLineIdx = getEndOfSectionLineByHeadings(
		targetHeading as Heading,
		headings,
		lastLineInBodyIdx,
		shouldConsiderSubsections
	);

	const lastNonEmptyLineInSectionIdx = findPriorIdx(
		lines,
		endOfSectionLineIdx,
		(str: string) => str.trim() !== ""
	);
    
	if (lastNonEmptyLineInSectionIdx !== null) {
        if (lastNonEmptyLineInSectionIdx + 1 === lastLineInBodyIdx) {
            return endOfSectionLineIdx;
        }
		return lastNonEmptyLineInSectionIdx;
	}

	return endOfSectionLineIdx;
}

function getEndOfSectionLineByHeadings(
	targetHeading: Heading,
	headings: Heading[],
	lastLineInBodyIdx: number,
	shouldConsiderSubsections: boolean
): number {
	const targetHeadingIdx = headings.findIndex((heading) =>
		isSameHeading(heading, targetHeading)
	);
	const targetHeadingIsLastHeading = targetHeadingIdx === headings.length - 1;

	if (targetHeadingIsLastHeading) {
		return lastLineInBodyIdx;
	}

	const [nextHigherOrSameLevelHeadingIndex, foundHigherOrSameLevelHeading] =
		findNextHigherOrSameLevelHeading(targetHeading, headings);

	const higherLevelSectionIsLastHeading =
		foundHigherOrSameLevelHeading &&
		nextHigherOrSameLevelHeadingIndex === headings.length;

	if (higherLevelSectionIsLastHeading) {
		return lastLineInBodyIdx;
	}

	if (foundHigherOrSameLevelHeading && shouldConsiderSubsections) {
		// If the target section is the last section of its level, and there are higher level sections,
		const nextHigherLevelHeadingLineIdx =
			headings[nextHigherOrSameLevelHeadingIndex].line;
		return nextHigherLevelHeadingLineIdx - 1;
	}

	if (foundHigherOrSameLevelHeading && !shouldConsiderSubsections) {
		return headings[targetHeadingIdx + 1].line;
	}

	// There are no higher level sections, but there may be more sections.
	return lastLineInBodyIdx;
}

function findNextHigherOrSameLevelHeading(
	targetHeading: Heading,
	headings: Heading[]
): readonly [number, boolean] {
	const targetHeadingIdx = headings.findIndex((heading) =>
		isSameHeading(heading, targetHeading)
	);

	const nextSameOrHigherLevelHeadingIdx = findNextIdx(
		headings,
		targetHeadingIdx,
		(heading) => heading.level <= targetHeading.level
	);

	if (nextSameOrHigherLevelHeadingIdx === null) {
		return [-1, false];
	}

	return [nextSameOrHigherLevelHeadingIdx, true];
}

function findPriorIdx<T>(
	items: T[],
	fromIdx: number,
	condition: (item: T) => boolean
): number | null {
	for (let i = fromIdx - 1; i >= 0; i--) {
		if (condition(items[i])) {
			return i;
		}
	}

	return null; // If no non-empty string is found before the given index
}

function findNextIdx<T>(
	items: T[],
	fromIdx: number,
	condition: (item: T) => boolean
): number | null {
	for (let i = fromIdx + 1; i < items.length; i++) {
		if (condition(items[i])) {
			return i;
		}
	}

	return null;
}