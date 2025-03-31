import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { X, ChevronDown } from "lucide-react";

export default function BlogPageTagsDropdown({
  blogDetails,
  selectedTag,
  handleTagClick,
}: {
  blogDetails: { tags: { name: string; number_of_pages: number }[] };
  selectedTag: string | null;
  handleTagClick: (tag: string) => void;
}) {
  return (
    <div className="gap-2 items-center flex w-[232px] ">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            className="w-52 rounded-md capitalize border-yellow-600 text-white transition-colors duration-300 flex items-center justify-between"
          >
            <span>{selectedTag ? selectedTag : "Tag Selection"}</span>
            <div className="flex items-center space-x-2">
              <ChevronDown className="w-4 h-4" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-52 bg-[#171717] border border-[#171717] rounded-md shadow-lg">
          {blogDetails.tags.map((tag, index) => {
            const isSelected = selectedTag === tag.name;
            return (
              <DropdownMenuItem
                key={index}
                onSelect={() => handleTagClick(tag.name)}
                className={`capitalize transition-colors duration-200  text-white my-1 ${
                  isSelected ? "bg-yellow-700 " : "hover:bg-[#241405]"
                }`}
              >
                {tag.name} <span className="ml-1">({tag.number_of_pages})</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedTag && (
        <span
          onClick={(e) => {
            e.stopPropagation(); // prevent triggering the dropdown
            handleTagClick(selectedTag);
          }}
          className=" cursor-pointer focus:outline-none "
        >
          <X className="w-4 h-4 hover:text-yellow-700" />
        </span>
      )}
    </div>
  );
}
